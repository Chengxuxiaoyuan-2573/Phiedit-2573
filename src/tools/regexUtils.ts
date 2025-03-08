export default {
    imageFile: /\.(png|jpg|jpeg|bmp|gif|svg|webp)$/i,
    audioFile: /\.(mp3|ogg|wav|m4a)$/i,
    chartFile: /\.(json|pec)$/i,
    number: /^-?\d+(\.\d+)?([eE][-+]?\d+)?/,
    lowerCase: /^[a-z]+$/,
    upperCase: /^[A-Z]+$/,
    letters: /^[a-zA-Z]+$/,
    identifier: /^[a-zA-Z_$][\w$]*/,
    hex: /^0x[0-9a-fA-F]+$/,
    binary: /^0b[01]+$/,
    octal: /^0o[0-7]+$/,
    decimal: /^[1-9][0-9]*$/,
}