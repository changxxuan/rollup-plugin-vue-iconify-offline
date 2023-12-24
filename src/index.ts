import type { Plugin } from 'rollup';
import { getIcons, minifyIconSet, stringToIcon } from '@iconify/utils';
import type { IconifyJSON, IconifyMetaData } from '@iconify/types';
import { createRequire } from 'module';
import { readFileSync } from 'fs';

const IconifyVue = '@iconify/vue';

let iconCount = 0;

const require = createRequire(import.meta.url);

async function createBundleTask(sources: IconifyOfflineConfig) {
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
        } else {
          throw new Error(`Cannot find required icons: ${icons.join(',')}`);
        }
      } else {
        throw new Error(`Cannot find required icons in @iconify/json: ${value.reason}`);
      }
    });
  }

  if (Array.isArray(sources.jsons) && sources.jsons.length) {
    const getIconSetPromises: Promise<IconifyJSON>[] = [];
    sources.jsons.forEach((json) => {
      // eslint-disable-next-line no-async-promise-executor
      getIconSetPromises.push(new Promise(async (resolve) => {
        const iconSet = await getIconSet(json);
        resolve(iconSet);
      }));
    });
    const values = await Promise.allSettled(getIconSetPromises);
    values.forEach((value) => {
      if (value.status === 'fulfilled') {
        const iconSetData = value.value;
        removeMetaData(iconSetData);
        minifyIconSet(iconSetData);
        bundle += 'addCollection(' + JSON.stringify(iconSetData) + ');\n';
        // iconCount += Object.keys(iconSetData.icons).length;
      } else {
        throw new Error(`Cannot find required icons in @iconify/json: ${value.reason}`);
      }
    });  
  }

  console.log(`\nkanjian-iconify-offline-plugin work finished! handled ${iconCount} icons, bundle size: ${bundle.length} bytes\n`);
  // Save to file
  return bundle;
}

/**
   * Sort icon names by prefix
   * @param icons
   * @returns icons
   */
function organizeIconsList(icons: string[]) {
  const iconMap = new Map();
  const getIconSetPromises: Promise<IconifyJSON>[] = [];
  icons.forEach(icon => {
    const item = stringToIcon(icon);
    if (!item) {
      return;
    }
    const prefix = item.prefix;
    const name = item.name;
    if (iconMap.has(prefix)) {
      iconMap.set(prefix, [...iconMap.get(prefix), name]);
    } else {
      iconMap.set(prefix, [name]);
      // eslint-disable-next-line no-async-promise-executor
      getIconSetPromises.push(new Promise(async (resolve) => {
        const iconSet = await getIconSet(prefix);
        resolve(iconSet);
      }));
    }
  });

  return {
    iconMap,
    getIconSetPromises
  };
}

const getIconSet = async (prefix: string) => {
  const iconSet = JSON.parse(await readFileSync(require.resolve(`@iconify/json/json/${prefix}.json`), 'utf-8')) as IconifyJSON;
  return iconSet;
};

function removeMetaData(iconSet: IconifyJSON) {
  const props: (keyof IconifyMetaData)[] = [
    'info',
    'chars',
    'categories',
    'themes',
    'prefixes',
    'suffixes'
  ];
  props.forEach(prop => {
    delete iconSet[prop];
  }); 
}

function isMainRequest(id: string) {
  const fileName = id.split('/').pop();
  return fileName === 'main.ts';
}

export default function (sources: IconifyOfflineConfig): Plugin {
  const virtualModuleId = 'virual:rollup-plugin-vue-iconify-offline';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;
  return {
    name: virtualModuleId,
    resolveId(id) {
      if (id === virtualModuleId) {
        // console.log('!!! resolveId !!!', id);
        return resolvedVirtualModuleId;
      }
      return null;
    },
    async load(id) {
      if (id === resolvedVirtualModuleId) {
        // console.log('load: ' + id);
        const iconSet = await createBundleTask(sources);
        return iconSet;
      }
      return null;
    },
    transform(code, id) {
      if (isMainRequest(id)) {
        return {
          code,
          map: null
        };
        // console.log('transform: ', code, id);
        // return {
        //   // code: 'import \'' + resolvedVirtualModuleId + '\';\n\n' + code,
        //   code: 'console.log("transform add ... ");\n\n' + code,
        //   map: null
        // };
      }
    }
  };
}
