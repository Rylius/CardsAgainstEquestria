module.exports = function (grunt) {

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        less: {
            styles: {
                options: {
                    compress: true,
                    cleancss: true,
                    ieCompat: true
                },
                files: {
                    "dist/styles/style.css": "public/styles/style.less"
                }
            }
        },
        concat: {
            options: {
                separator: ';\n',
                stripBanners: true
            },
            cae: {
                src: [
                    'public/js/constants.js',
                    'public/js/knockout.js',
                    'public/js/view/**/*.js'
                ],
                dest: 'dist/js/cae.js'
            },
            vendors: {
                src: [
                    'public/js/vendor/**/*.js',
                    '!**/jquery-*.min.js'
                ],
                dest: 'dist/js/vendors.min.js'
            }
        },
        uglify: {
            options: {
                banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd hh:MM:ss") %> - unminified source at <%= pkg.homepage %> */\n'
            },
            js: {
                src: 'dist/js/cae.js',
                dest: 'dist/js/cae.min.js'
            }
        },
        copy: {
            assets: {
                files: [
                    {
                        src: 'fonts/*',
                        dest: 'dist/',
                        expand: true,
                        cwd: 'public/'
                    },
                    {
                        src: 'img/**/*',
                        dest: 'dist/',
                        expand: true,
                        cwd: 'public/'
                    },
                    {
                        src: 'jquery-*.min.js',
                        dest: 'dist/js/',
                        expand: true,
                        cwd: 'public/js/vendor/'
                    }
                ]
            }
        }
    });

    grunt.loadNpmTasks('grunt-contrib-less');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.registerTask('default', ['less', 'concat', 'uglify', 'copy']);
};
