import pkg from "./package.json" assert { type: "json" };

export default {
  input: 'src/index.js',
  output: [
    {
      file: pkg.main,
      format: "umd",
      name: `dist/${pkg.name}/index.umd.js`,
      sourcemap: true,
    },
  ],
};
