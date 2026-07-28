export const reverseAngle = (value: number): number => {
  // add 180 to flip
  let result = value + 180

  // wrap into 0..360
  result = ((result % 360) + 360) % 360

  // shift to -180..180
  if (result > 180) result -= 360

  return result
}
