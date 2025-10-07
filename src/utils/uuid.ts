export const nanoid = (size = 10): string => {
  const alphabet = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  let id = ''
  const alphabetLength = alphabet.length
  for (let i = 0; i < size; i += 1) {
    const index = Math.floor(Math.random() * alphabetLength)
    id += alphabet[index]
  }
  return id
}
