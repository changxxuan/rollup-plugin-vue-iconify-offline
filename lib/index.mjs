import { getIcons, stringToIcon } from '@iconify/utils';

const IconifyVue = '@iconify/vue';
let iconCount = 0;
function index (sources) {
    const virtualModuleId = 'rollup-plugin-vue-iconify-offline';
    const resolvedVirtualModuleId = '\0' + virtualModuleId;
    return {
        name: 'rollup-plugin-vue-iconify-offline',
        resolveId(id) {
            if (id === virtualModuleId) {
                return resolvedVirtualModuleId;
            }
            return null;
        },
        async load(id) {
            if (id === resolvedVirtualModuleId) {
                // if (!process) {
                //   console.log('* 不是node环境*', process);
                //   return null;
                // }
                // const iconSet = await createBundleTask(sources);
                // return iconSet;
                await createBundleTask(sources);
            }
            return null;
        }
    };
}
async function createBundleTask(sources) {
    let bundle = 'import { addCollection } from \'' + IconifyVue + '\';\n\n';
    if (Array.isArray(sources.icons) && sources.icons.length) {
        // Sort icons by prefix
        const { iconMap, getIconSetPromises } = organizeIconsList(sources.icons);
        const values = await Promise.allSettled(getIconSetPromises);
        values.forEach((value) => {
            if (value.status === 'fulfilled') {
                const prefix = value.value.prefix;
                const icons = iconMap.get(prefix);
                const iconSetData = getIcons(value.value, icons);
                if (iconSetData) {
                    bundle += 'addCollection(' + JSON.stringify(iconSetData) + ');\n';
                    iconCount += icons.length;
                }
                else {
                    throw new Error(`Cannot find required icons: ${icons.join(',')}`);
                }
            }
            else {
                throw new Error(`Cannot find required icons in @iconify/json: ${value.reason}`);
            }
        });
    }
    console.log(`\nkanjian-iconify-offline-plugin work finished! handled ${iconCount} icons, bundle size: ${bundle.length} bytes\n`);
    // Save to file
    return bundle;
}
/**
 * read icon json data from @iconify/json by prefix
 * @param prefix
 * @returns
 */
// const getIconSet = (prefix: string) => {
// const iconSet = JSON.parse(readFileSync(require.resolve(`@iconify/json/json/${prefix}.json`), 'utf-8')) as IconifyJSON;
//   return iconSet;
// };
const getIconSet = async (prefix) => {
    const iconSet = await import(/* @vite-ignore */ `@iconify/json/json/${prefix}.json`);
    console.log(`@iconify/json/json/${prefix}.json`, iconSet);
    return iconSet;
};
/**
 * Sort icon names by prefix
 * @param icons
 * @returns icons
 */
function organizeIconsList(icons) {
    const iconMap = new Map();
    const getIconSetPromises = [];
    icons.forEach(icon => {
        const item = stringToIcon(icon);
        if (item) {
            const prefix = item.prefix;
            const name = item.name;
            if (iconMap.has(prefix)) {
                iconMap.set(prefix, [...iconMap.get(prefix), name]);
            }
            else {
                iconMap.set(prefix, [name]);
                getIconSetPromises.push(new Promise((resolve) => {
                    getIconSet(prefix).then(iconSet => resolve(iconSet));
                }));
            }
        }
    });
    return {
        iconMap,
        getIconSetPromises
    };
}

export { index as default };
//# sourceMappingURL=index.mjs.map
