async function searchBusinesses() {
  console.warn(
    "[googleMapsProvider] No hay integracion real configurada todavia. Regresando 0 candidatos."
  );

  return [];
}

module.exports = {
  name: "googleMaps",
  searchBusinesses,
};
