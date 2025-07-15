import { Q96 } from '../config/constants';

/**
 * Calculates the amount of token0 and token1 for a given position
 * @param sqrtPrice96 The current sqrt price of the pool (Q96)
 * @param tickLower The lower tick of the position
 * @param tickUpper The upper tick of the position
 * @param liquidity The liquidity of the position
 * @returns An object containing amount0 and amount1 in their respective decimals
 */
export function getAmountsForPosition(
  sqrtPrice96: bigint,
  tickLower: number,
  tickUpper: number,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  const sqrtRatioA = getSqrtRatioAtTick(tickLower);
  const sqrtRatioB = getSqrtRatioAtTick(tickUpper);

  return getAmountsForLiquidity(sqrtPrice96, sqrtRatioA, sqrtRatioB, liquidity);
}

/**
 * Calculates the amounts of token0 and token1 for given liquidity and price range
 * @param sqrtRatioX96 The current sqrt price
 * @param sqrtRatioAX96 The sqrt price at lower tick
 * @param sqrtRatioBX96 The sqrt price at upper tick
 * @param liquidity The liquidity amount
 * @returns The amounts of token0 and token1
 */
function getAmountsForLiquidity(
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): { amount0: bigint; amount1: bigint } {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  let amount0: bigint;
  let amount1: bigint;

  if (sqrtRatioX96 <= sqrtRatioAX96) {
    amount0 = getLiquidityForAmount0(sqrtRatioAX96, sqrtRatioBX96, liquidity);
    amount1 = 0n;
  } else if (sqrtRatioX96 < sqrtRatioBX96) {
    amount0 = getLiquidityForAmount0(sqrtRatioX96, sqrtRatioBX96, liquidity);
    amount1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioX96, liquidity);
  } else {
    amount0 = 0n;
    amount1 = getLiquidityForAmount1(sqrtRatioAX96, sqrtRatioBX96, liquidity);
  }

  return { amount0, amount1 };
}

/**
 * Calculates the amount of token0 for given liquidity between two sqrt prices
 */
function getLiquidityForAmount0(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  const numerator = (liquidity * Q96 * (sqrtRatioBX96 - sqrtRatioAX96));
  const denominator = sqrtRatioBX96 * sqrtRatioAX96;

  return numerator / denominator;
}

/**
 * Calculates the amount of token1 for given liquidity between two sqrt prices
 */
function getLiquidityForAmount1(
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  liquidity: bigint
): bigint {
  if (sqrtRatioAX96 > sqrtRatioBX96) {
    [sqrtRatioAX96, sqrtRatioBX96] = [sqrtRatioBX96, sqrtRatioAX96];
  }

  return liquidity * (sqrtRatioBX96 - sqrtRatioAX96) / Q96;
}

/**
 * Calculates the sqrt ratio at a given tick
 * @param tick The tick to calculate the sqrt ratio for
 * @returns The sqrt ratio as a Q96 number
 */
function getSqrtRatioAtTick(tick: number): bigint {
  const absTick = tick < 0 ? -tick : tick;
  let ratio = (absTick & 0x1) != 0 
    ? 0xfffcb933bd6fad37aa2d162d1a594001n 
    : 0x100000000000000000000000000000000n;

  if ((absTick & 0x2) != 0) ratio = (ratio * 0xfff97272373d413259a46990580e213an) >> 128n;
  if ((absTick & 0x4) != 0) ratio = (ratio * 0xfff2e50f5f656932ef12357cf3c7fdccn) >> 128n;
  if ((absTick & 0x8) != 0) ratio = (ratio * 0xffe5caca7e10e4e61c3624eaa0941cd0n) >> 128n;
  if ((absTick & 0x10) != 0) ratio = (ratio * 0xffcb9843d60f6159c9db58835c926644n) >> 128n;
  if ((absTick & 0x20) != 0) ratio = (ratio * 0xff973b41fa98c081472e6896dfb254c0n) >> 128n;
  if ((absTick & 0x40) != 0) ratio = (ratio * 0xff2ea16466c96a3843ec78b326b52861n) >> 128n;
  if ((absTick & 0x80) != 0) ratio = (ratio * 0xfe5dee046a99a2a811c461f1969c3053n) >> 128n;
  if ((absTick & 0x100) != 0) ratio = (ratio * 0xfcbe86c7900a88aedcffc83b479aa3a4n) >> 128n;
  if ((absTick & 0x200) != 0) ratio = (ratio * 0xf987a7253ac413176f2b074cf7815e54n) >> 128n;
  if ((absTick & 0x400) != 0) ratio = (ratio * 0xf3392b0822b70005940c7a398e4b70f3n) >> 128n;
  if ((absTick & 0x800) != 0) ratio = (ratio * 0xe7159475a2c29b7443b29c7fa6e889d9n) >> 128n;
  if ((absTick & 0x1000) != 0) ratio = (ratio * 0xd097f3bdfd2022b8845ad8f792aa5825n) >> 128n;
  if ((absTick & 0x2000) != 0) ratio = (ratio * 0xa9f746462d870fdf8a65dc1f90e061e5n) >> 128n;
  if ((absTick & 0x4000) != 0) ratio = (ratio * 0x70d869a156d2a1b890bb3df62baf32f7n) >> 128n;
  if ((absTick & 0x8000) != 0) ratio = (ratio * 0x31be135f97d08fd981231505542fcfa6n) >> 128n;
  if ((absTick & 0x10000) != 0) ratio = (ratio * 0x9aa508b5b7a84e1c677de54f3e99bc9n) >> 128n;
  if ((absTick & 0x20000) != 0) ratio = (ratio * 0x5d6af8dedb81196699c329225ee604n) >> 128n;
  if ((absTick & 0x40000) != 0) ratio = (ratio * 0x2216e584f5fa1ea926041bedfe98n) >> 128n;
  if ((absTick & 0x80000) != 0) ratio = (ratio * 0x48a170391f7dc42444e8fa2n) >> 128n;

  if (tick > 0) ratio = ((2n ** 256n) - 1n) / ratio;

  // Downcast to uint160
  return ratio >> 32n;
}
