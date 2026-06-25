const SURF_API = 'https://surflending.org';

async function surfFetch(path) {
  const res = await fetch(SURF_API + path);
  if (!res.ok) return null;
  return res.json();
}

function decodeAsset(policyId, assetNameHex) {
  if (!policyId) return { ticker: 'ADA', decimals: 6, policyId: '', assetName: '' };
  let name = '';
  if (assetNameHex) {
    try { name = decodeURIComponent(assetNameHex.replace(/([0-9a-fA-F]{2})/g, '%$1')); } catch {}
  }
  return { policyId, assetName: assetNameHex || '', name };
}

function parseAssetId(key) {
  if (!key) return { policyId: '', assetName: '' };
  if (!key.includes('.')) return { policyId: key, assetName: '' };
  const dot = key.indexOf('.');
  return { policyId: key.slice(0, dot), assetName: key.slice(dot + 1) };
}

export default async function handler(req, res) {
  const { address } = req.query;

  try {
    const [poolData, posData, surfPriceData, adaPriceData, stakingInfo, stakingApy, stakingChart] = await Promise.all([
      surfFetch('/api/getAllPoolInfos'),
      surfFetch('/api/getAllPositions' + (address ? `?address=${encodeURIComponent(address)}` : '')),
      surfFetch('/api/getSurfPrice'),
      surfFetch('/api/getAdaPrice'),
      surfFetch('/api/staking/getInfo'),
      surfFetch('/api/staking/getAPY'),
      surfFetch('/api/staking/getRewardsChart'),
    ]);

    if (!poolData) {
      return res.status(502).json({ error: 'Could not fetch pool data' });
    }

    const surfPrice = surfPriceData?.price || 0;
    const adaPrice = adaPriceData?.price || 0;

    const pools = poolData.poolInfos || poolData;
    const poolEntries = Object.entries(pools).map(([poolId, info]) => {
      const asset = info.asset || {};
      const ctoken = info.cToken || {};
      const collaterals = (info.collateralAssets || []).map(c => ({
        ticker: c.asset?.ticker || '?',
        policyId: c.asset?.policyId || '',
        assetName: c.asset?.assetName || '',
        decimals: c.asset?.decimals || 0,
        price: c.price || 0,
        maxBorrowLTV: c.maxBorrowLTV || 0,
        liquidationThresholdLTV: c.liquidationThresholdLTV || 0,
      }));
      return {
        poolId,
        asset: { ticker: asset.ticker || '?', policyId: asset.policyId || '', assetName: asset.assetName || '', decimals: asset.decimals || 0 },
        price: info.price || 0,
        collateralAssets: collaterals,
        totalSupplied: info.totalSupplied || 0,
        totalBorrowed: info.totalBorrowed || 0,
        reserve: info.reserve || 0,
        reserveFactor: info.reserveFactor || 0,
        supplyApy: info.supplyApy || 0,
        borrowApr: info.borrowApr || 0,
        totalCToken: info.totalCToken || 0,
        totalUnpaidInterest: info.totalUnpaidInterest || 0,
        u: info.u || 0,
        cToken: { policyId: ctoken.policyId || '', assetName: ctoken.assetName || '' },
        maxBorrowLTV: info.maxBorrowLTV || 0,
        recommendedBorrowLTV: info.recommendedBorrowLTV || 0,
        liquidationThresholdLTV: info.liquidationThresholdLTV || 0,
        historicalApy: info.historicalApy || 0,
        totalVolume: info.totalVolume || 0,
      };
    });

    const poolMap = {};
    for (const p of poolEntries) poolMap[p.poolId] = p;

    const positionsRaw = posData?.positions || [];
    const positions = [];
    for (const poolPos of positionsRaw) {
      const poolId = poolPos.poolId;
      const pool = poolMap[poolId];
      const list = poolPos.positions || [];
      for (const pos of list) {
        const now = Date.now();
        const elapsedMs = now - (pos.startTime || now);
        const elapsedYears = elapsedMs / 31557600000;
        const principal = Number(pos.principal || 0);
        const collateral = Number(pos.collateral || 0);
        const interestRate = Number(pos.interestRate || 0);
        const accruedInterest = principal * interestRate * elapsedYears;
        const totalOwed = principal + accruedInterest;

        const poolAsset = pool?.asset || { ticker: '?', decimals: 6, policyId: '' };
        const principalDecimals = poolAsset.decimals || 6;
        const isCollateralADA = !pos.collateralAsset?.policyId;

        let collInfo = null;
        if (pool && !isCollateralADA) {
          collInfo = pool.collateralAssets.find(c =>
            c.policyId === pos.collateralAsset.policyId &&
            c.assetName === pos.collateralAsset.assetName
          );
        }
        const collateralDecimals = isCollateralADA ? 6 : (collInfo?.decimals || 0);

        const principalTicker = poolAsset.ticker || (poolAsset.policyId ? poolAsset.policyId.slice(0, 6) + '..' : 'ADA');
        const collateralTicker = isCollateralADA ? 'ADA' : (collInfo?.ticker || '?');

        const principalPriceADA = pool?.price || 1;
        let collateralPriceADA = 0;
        if (isCollateralADA) {
          collateralPriceADA = 1;
        } else if (collInfo) {
          collateralPriceADA = (collInfo.price || 0) * principalPriceADA;
        }

        const principalValueADA = (principal / Math.pow(10, principalDecimals)) * principalPriceADA;
        const totalOwedADA = (totalOwed / Math.pow(10, principalDecimals)) * principalPriceADA;
        const collateralADA = collateralPriceADA > 0 ? (collateral / Math.pow(10, collateralDecimals)) * collateralPriceADA : 0;
        const netValueADA = collateralADA - totalOwedADA;

        const principalValueUSD = principalValueADA * adaPrice;
        const totalOwedUSD = totalOwedADA * adaPrice;
        const collateralValueUSD = collateralADA * adaPrice;
        const netValueUSD = netValueADA * adaPrice;
        const principalPriceUSD = principalPriceADA * adaPrice;
        const collateralPriceUSD = collateralPriceADA * adaPrice;

        const computedLtv = collateralADA > 0 ? totalOwedADA / collateralADA : 0;

        positions.push({
          poolId,
          address: pos.address,
          principal,
          principalDecimals,
          principalTicker,
          principalPolicyId: pos.principalAsset?.policyId || '',
          principalAssetName: pos.principalAsset?.assetName || '',
          collateral,
          collateralDecimals,
          collateralTicker,
          collateralPolicyId: pos.collateralAsset?.policyId || '',
          collateralAssetName: pos.collateralAsset?.assetName || '',
          interestRate,
          startTime: pos.startTime,
          ltv: computedLtv,
          borrowId: pos.borrowId || null,
          outRef: pos.outRef || null,
          elapsedYears,
          accruedInterest,
          totalOwed,
          principalValueUSD,
          totalOwedUSD,
          collateralValueUSD,
          netValueUSD,
          principalPriceUSD,
          collateralPriceUSD,
        });
      }
    }

    const poolsArray = poolEntries.map(p => {
      const decimals = p.asset.decimals || 0;
      const totalSuppliedADA = (p.totalSupplied / Math.pow(10, decimals)) * p.price;
      const totalBorrowedADA = (p.totalBorrowed / Math.pow(10, decimals)) * p.price;
      const totalSuppliedUSD = totalSuppliedADA * adaPrice;
      const totalBorrowedUSD = totalBorrowedADA * adaPrice;
      return {
        ...p,
        totalSuppliedUSD,
        totalBorrowedUSD,
        utilizationRate: p.totalSupplied > 0 ? p.totalBorrowed / p.totalSupplied : 0,
      };
    });

    return res.json({
      pools: poolsArray,
      positions,
      summary: {
        totalPositions: positions.length,
        totalPools: poolsArray.length,
        totalSuppliedUSD: poolsArray.reduce((s, p) => s + p.totalSuppliedUSD, 0),
        totalBorrowedUSD: positions.reduce((s, p) => s + p.totalOwedUSD, 0),
        totalCollateralUSD: positions.reduce((s, p) => s + p.collateralValueUSD, 0),
        totalNetValueUSD: positions.reduce((s, p) => s + p.netValueUSD, 0),
        surfPrice,      // ada per SURF
        surfPriceUSD: surfPrice * adaPrice,
        adaPrice,       // usd per ADA
        fetchedAt: Date.now(),
      },
      staking: {
        info: stakingInfo?.info || null,
        apy: stakingApy || null,
        rewardsChart: stakingChart?.data || [],
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
