amodule.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
        plugins: [
            'react-native-reanimated/plugin',
            // Fix for Zustand 5+ import.meta.env on web
            function () {
                return {
                    visitor: {
                        MemberExpression(path) {
                            if (path.node.object.type === 'MetaProperty' &&
                                path.node.object.meta.name === 'import' &&
                                path.node.object.property.name === 'meta' &&
                                path.node.property.name === 'env') {
                                path.replaceWithSourceString('(process.env || {})');
                            }
                        }
                    }
                };
            }
        ],
    };
};
