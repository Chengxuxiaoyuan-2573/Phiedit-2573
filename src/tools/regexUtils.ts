export default class RegexUtils {
    static readonly imageFile = /\.(png|jpg|jpeg|bmp|gif|svg|webp)$/i
    static readonly audioFile = /\.(mp3|ogg|wav|m4a)$/i
    static readonly chartFile = /\.(json|pec)$/i
    static readonly number = /^-?\d+(\.\d+)?([eE][-+]?\d+)?/
    static readonly lowerCase = /^[a-z]+$/
    static readonly upperCase = /^[A-Z]+$/
    static readonly letters = /^[a-zA-Z]+$/
    static readonly identifier = /^[a-zA-Z_$][\w$]*/
    static readonly hex = /^0x[0-9a-fA-F]+$/
    static readonly binary = /^0b[01]+$/
    static readonly octal = /^0o[0-7]+$/
    static readonly decimal = /^[1-9][0-9]*$/
}