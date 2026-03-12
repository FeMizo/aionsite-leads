async function searchBusinesses() {
  console.warn(
    "[webSearchProvider] No hay integracion real configurada todavia. Regresando 0 candidatos."
  );

  return [];
}

module.exports = {
  name: "webSearch",
  searchBusinesses,
};
