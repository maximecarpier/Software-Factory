// Transforme import/export → require/module.exports pour Jest (mode CJS).
// Cela rend les exports de modules mutables, ce qui permet à jest.spyOn de fonctionner.
// "type": "module" dans package.json force l'extension .cjs pour ce fichier.
module.exports = {
  plugins: ['@babel/plugin-transform-modules-commonjs']
};
