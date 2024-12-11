import React from 'react';

const IngredientesContext = React.createContext({
  ingredientes: [],
  setIngredientes: () => {}
});

export default IngredientesContext;