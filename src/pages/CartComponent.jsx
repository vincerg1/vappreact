import { useContext, useEffect } from 'react';
import { _PizzaContext } from './_PizzaContext';

const CartComponent = () => {
  const { cart } = useContext(_PizzaContext);
  

  useEffect(() => {
    console.log("Carrito actualizado:", cart);
  }, [cart]);

  return (
    <div>
      <h1>Carrito</h1>
    </div>
  );
};

export default CartComponent;
