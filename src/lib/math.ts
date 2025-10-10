export function kahanSum(nums: number[]) {
  let sum = 0,
    c = 0;
  for (const x of nums) {
    const y = x - c;
    const t = sum + y;
    c = t - sum - y;
    sum = t;
  }
  return sum;
}
