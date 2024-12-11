export function determinarZonaRiesgo (disponible, limite) {
    if (disponible <= 10) {
      return 4;
    } else if (disponible < limite) {
      return 3;
    } else if (disponible < limite * 1.10) {
      return 2;
    } else if (disponible <= limite * 2) {
      return 1;
    }
    return 0;
  };