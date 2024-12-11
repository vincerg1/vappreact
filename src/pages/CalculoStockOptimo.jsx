const obtenerPromedioConsumo = (consumo) => {
    const totalConsumo = consumo.reduce((acumulado, actual) => acumulado + actual.cantidad, 0);
    return totalConsumo / consumo.length;
  };
  
  const calcularStockOptimo = (consumo, inventarioDisponible, diasCobertura = 2) => {
    const promedioConsumo = obtenerPromedioConsumo(consumo);
    const stockOptimo = promedioConsumo * diasCobertura;
  
    return inventarioDisponible > stockOptimo;
  };
  