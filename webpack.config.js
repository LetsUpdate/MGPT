const path = require('path');
const { UserscriptPlugin } = require('webpack-userscript');
const TerserPlugin = require('terser-webpack-plugin');


const dev = process.env.NODE_ENV === 'development';

module.exports = {
    mode: dev ? 'development' : 'production',
    entry: path.resolve(__dirname, 'src', 'index.js'), // Your entry point
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'MGPT.user.js', // Output file
    },
    devServer: {
        static: {
            directory: path.join(__dirname, 'dist'),
        },
        client: false, // Disable client injection
        hot: false, // Disable hot reloading


    },
    optimization: {
        minimize: dev ? false : true,
        minimizer: [
            new TerserPlugin({
              terserOptions: {
                compress: {
                  drop_console: dev ? false : true,
                },
              },
            }),
          ],
      },
    plugins: [
        new UserscriptPlugin({
                        headers(original) {
                            const baseHeaders = {
                                name: 'Moodle GPT',
                                namespace: 'https://github.com/LetsUpdate/MGPT',
                                description: 'AI-powered learning assistant for Moodle',
                                author: 'RED',
                                include: [
                                    'https://main.elearning.uni-obuda.hu/*',
                                    'https://kmooc.elearning.uni-obuda.hu/*',
                                    'https://elearning.uni-obuda.hu/*',
                                    'https://exam.elearning.uni-obuda.hu/*',
                                    'https://oktatas.mai.kvk.uni-obuda.hu/*',
                                    'https://portal.kgk.uni-obuda.hu/*',
                                    'https://mooc.unideb.hu/*',
                                    'https://elearning.unideb.hu/*',
                                    'https://elearning.med.unideb.hu/*',
                                    'https://exam.unideb.hu/*',
                                    'https://itc.semmelweis.hu/moodle/*',
                                    'https://szelearning.sze.hu/*',
                                    'https://moodle.kre.hu/*',
                                    'https://moodle.pte.hu/*',
                                    'https://elearning.uni-miskolc.hu/*',
                                    'https://elearning.uni-mate.hu/*',
                                    'https://moodle.gtk.uni-pannon.hu/*',
                                    'https://edu.gtk.bme.hu/*',
                                    'https://edu.gpk.bme.hu/*',
                                    'https://iktblog.hu/*',
                                    'https://moodle.ms.sapientia.ro/*',
                                    'https://moodle.uni-corvinus.hu/*',
                                    'https://v39.moodle.uniduna.hu/*',
                                    'https://mentok.net/*',
                                    'https://moodle.ch.bme.hu/*',
                                    'https://kmooc.uni-obuda.hu/*'
                                ],
                                noframes: true,
                                grant: [
                                    'GM_getResourceText',
                                    'GM_info',
                                    'GM_getValue',
                                    'GM_setValue',
                                    'GM_deleteValue',
                                    'GM_xmlhttpRequest',
                                    'GM_openInTab',
                                    'unsafeWindow'
                                ],
                                "run-at": "document-start",
                                require: "https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js",
                                updateURL: "https://github.com/LetsUpdate/MGPT/releases/latest/download/MGPT.meta.js",
                                downloadURL:"https://github.com/LetsUpdate/MGPT/releases/latest/download/MGPT.user.js",
                                supportURL:"https://github.com/LetsUpdate/MGPT",
                                icon64: "https://raw.githubusercontent.com/LetsUpdate/MGPT/main/.github/icon.png",
                                license: "MIT",

                            };
                        
                            if (dev) {
                                return {
                                    ...original,
                                    ...baseHeaders,
                                    version: `${original.version}-build.[buildNo]`,
                                };
                            }
                        
                            return {
                                ...original,
                                ...baseHeaders,
                            };
                        },

        }),
        
    ],
};