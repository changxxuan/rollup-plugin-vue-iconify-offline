import { readFileSync } from 'fs';
import { URL } from 'url';
import typescript from '@rollup/plugin-typescript';
import { builtinModules } from 'module';
import commonjsExternals from 'vite-plugin-commonjs-externals';

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default {
  input: 'src/index.ts',
  output: [
    {
      format: 'cjs',
      file: pkg.main,
      exports: 'named',
      footer: 'module.exports = Object.assign(exports.default, exports);',
      sourcemap: true
    },
    {
      format: 'es',
      file: pkg.module,
      sourcemap: true
    }
  ],
  external: Object.keys(pkg.dependencies || {})
      .concat(Object.keys(pkg.peerDependencies || {})),
  strictDeprecations: true,
  plugins: [
    typescript({ sourceMap: true })
    // commonjsExternals({
    //   externals: ['fs']  //这里
    // })
  ]
};
