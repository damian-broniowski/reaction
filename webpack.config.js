const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin'); // If you're using it for CSS

module.exports = {
    entry: './src/game.js', // Path to your game's entry point
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                    'postcss-loader'
                ]
            },
            {
                test: /\.(png|jpg|gif|mp3|wav|ogg)$/,
                use: [
                    {
                        loader: 'file-loader',
                        options: {
                            name: 'assets/[name].[ext]'
                        }
                    }
                ]
            }
        ]
    },

    output: {
        filename: 'bundle.js',
        path: __dirname + '/dist',
        publicPath: '/'  // Add this line

    },

    plugins: [
        new MiniCssExtractPlugin({
            filename: '[name].css',
            chunkFilename: '[id].css',
        }),

        new HtmlWebpackPlugin({
            template: './src/index.html', // Path to your source index.html
            filename: 'index.html',       // Output file (in your dist/ directory)
            inject: 'body'                // Where to inject the scripts (head or body)
        })
    ],
    devServer: {
        hot: true,
        port: 8080,
        open: true
    }
};
