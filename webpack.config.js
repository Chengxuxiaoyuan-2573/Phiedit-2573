module.exports = {
    module: {
        rules: [
            {
                test: /\.(png|jpg|gif|svg)$/,
                use: ['file-loader']
            },
            {
                test: /\.(mp3|wav|ogg)$/,
                use: ['file-loader']
            },
            {
                test: /\.zip$/,
                use: ['file-loader']
            },
            {
                test: /\.html$/,
                use: ['html-loader']
            },
            {
                test: /\.md$/,
                use: ['markdown-loader']
            },
            {
                test: /\.(js|ts)x?$/,
                use: ['babel-loader'],
                exclude: /node_modules/
            },
            {
                test: /\.txt$/,
                use: ['raw-loader']
            }
        ]
    }
}