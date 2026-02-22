import next from "eslint-config-next";

const config = [
  {
    ignores: ["node_modules/**", ".next/**"]
  },
  ...next
];

export default config;
