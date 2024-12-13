const { defineConfig } = require('@vue/cli-service');
module.exports = defineConfig({
	transpileDependencies: true,
	devServer: {
		host: '0.0.0.0',
		port: 8080
	},
	configureWebpack: {
		module: {
			rules: [
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
				}
			]
		}
	}
})
