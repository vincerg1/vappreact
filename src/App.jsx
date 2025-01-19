import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Footer from './components/Footer.jsx';
import Inicio from './pages/_Inicio';
import InicioSesion from './pages/_Inicio_sesion';
import Informacion from './pages/_Informacion';
import InfoEmpresa from './pages/_Info_Empresa.jsx';
import PaymentMethods from '../src/pages/_Info_MP.jsx';
import _Info_Restauratsx from '../src/pages/_Info_Restauratsx.jsx';
import _Menu_p1 from '../src/pages/_Menu_p1.jsx';
import CreateMenuForm from '../src/pages/_Menu_p2_crearMenu.jsx';
import MenuOverview from '../src/pages/_MenuOverview.jsx';
import EditarPizza from '../src/pages/_EditarPizza.jsx';
import { PizzaProvider } from '../src/pages/_PizzaContext.jsx';
import _InvIngDB from '../src/pages/_InvIngDB.jsx';
import _ListaIngredientes from '../src/pages/_ListaIngredientes.jsx';
import ActualizaStock from './pages/ActualizaStock.jsx';
import TestDB from './pages/TestDB.jsx';
import Inventario from './pages/Inventario.jsx';
import OrderNow from './pages/OrderNow.jsx';
import CustomerMenu from './pages/CustomerMenu.jsx';
import DetallesLote from './pages/DetallesLote.jsx';
import FormularioPizza from './pages/FormularioPizza.jsx';
import CartComponent from './pages/CartComponent.jsx';
import PartnerCreator from './pages/PartnerCreator.jsx';
import EditarPartner from './pages/EditarPartner.jsx';
import SimuladorVentas from './pages/SimuladorVentas.jsx';
import useRanking from './pages/RankING.jsx';
import CustomerPage from './pages/CustomerPage.jsx';
import OffersModule from './pages/OffersModule.jsx';
import OfferForm from './pages/OfferForm.jsx';
import OfferList from './pages/OfferList.jsx';
import Clientes from './pages/Clientes.jsx';
import Seguimiento from './pages/Seguimiento.jsx';
import ReviewForm from './components/ReviewForm.jsx';
import MakeYourPizza from './pages/MakeYourPizza.jsx';
import MakeARarePizza from './pages/MakeARarePizza.jsx';
import IncentivoForm from './pages/IncentivoForm.jsx';
import IncentivoList from './pages/IncentivoList.jsx';
import IncentivoListPage from './pages/IncentivoListPage.jsx';
import PizzariaDashboard from './pages/PizzariaDashboard';
import ViewOrder from './pages/ViewOrder.jsx';
import TestMap from './pages/TestMap.jsx';
import RouteSetter from './pages/RouteSetter.jsx';
import Repartidores from './pages/Repartidores.jsx';
import DeliveryPanel from './pages/DeliveryPanel.jsx';
import RouteSetterAdmin from './pages/RouteSetterAdmin.jsx';
import DRVCO from './pages/DRVCO.jsx';
import RRep from './pages/RRep.jsx';
import CrearAdmin from './pages/CrearAdmin.jsx';
import GestionarIngredientesExtras from './pages/GestionarIngredientesExtras.jsx';


function App() {
  const [menus, setMenus] = useState([]);

  return (
    <PizzaProvider>
      <BrowserRouter>
        <Routes>
       
         <Route path="/GestionarIngredientesExtras" element={<GestionarIngredientesExtras />} />
         <Route path="/register" element={<CrearAdmin />} />
         <Route path="/repartidores-reportes" element={<RRep />} />
         <Route path="/dashboard/drvco" element={<DRVCO />} />
         <Route path="/RouteSetterAdmin" element={<RouteSetterAdmin />} />
         <Route path="/DeliveryPanel" element={<DeliveryPanel />} />
         <Route path="/Repartidores" element={<Repartidores />} />
         <Route path="/RouteSetter" element={<RouteSetter />} />
         <Route path="/TestMap" element={<TestMap />} />
         <Route path="/view-order" element={<ViewOrder />} />
         <Route path="/pizzeria-dashboard" element={<PizzariaDashboard />} />
          {/* Rutas de Incentivos */}
          <Route path="/offers/incentivo" element={<IncentivoListPage />} />
          <Route path="/offers/incentivo/create" element={<IncentivoForm />} />
          <Route path="/offers/incentivo/edit/:id" element={<IncentivoForm />} />

          {/* Rutas de Ofertas */}
          <Route path="/offers/*" element={<OffersModule />} />
          <Route path="/offers/create" element={<OfferForm />} />
          <Route path="/offers/existing" element={<OfferList />} />
          <Route path="/offers/edit/:id" element={<OfferForm />} />
          

          {/* Otras Rutas */}
          <Route path="/ReviewForm" element={<ReviewForm />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/seguimiento" element={<Seguimiento />} />
          <Route path="/customer" element={<CustomerPage />} />
          <Route path="/SimuladorVentas" element={<SimuladorVentas />} />
          <Route path="/editarPartner/:partnerId" element={<EditarPartner />} />
          <Route path="/PartnerCreator" element={<PartnerCreator />} />
          <Route path="/CartComponent" element={<CartComponent />} />
          <Route path="/FormularioPizza" element={<FormularioPizza />} />
          <Route path="/DetallesLote" element={<DetallesLote />} />
          <Route path="/_Inicio/" element={<Inicio />} />
          <Route path="/order-now" element={<OrderNow />} />
          <Route path="/CustomerMenu" element={<CustomerMenu />} />
          <Route path="/make-your-pizza" element={<MakeYourPizza />} />
          <Route path="/rare-pizza" element={<MakeARarePizza />} />
          <Route path="/pages/RankING.jsx" element={<useRanking />} />
          <Route path="/_Inicio/_Informacion" element={<Informacion />} />
          <Route path="/_Inicio/_Informacion/_Info_Empresa" element={<InfoEmpresa />} />
          <Route path="/_Inicio/_Informacion/_Info_MP" element={<PaymentMethods />} />
          <Route path="/_Inicio/_Informacion/_Info_Restauratsx" element={<_Info_Restauratsx />} />
          <Route path="/_Inicio/_Menu_p1/" element={<_Menu_p1 />} />
          <Route path="/_Inicio/_Menu_p1/_Menu_p2_crearMenu" element={<CreateMenuForm setMenus={setMenus} menus={menus} />} />
          <Route path="/_Inicio/_Menu_p1/_MenuOverview" element={<MenuOverview menus={menus} />} />
          <Route path="/editarPizza/:pizzaId" element={<EditarPizza />} />
          <Route path="/_Inicio/_InvIngDB" element={<_InvIngDB />} />
          <Route path="/_Inicio/_InvIngDB/_ListaIngredientes" element={<_ListaIngredientes />} />
          <Route path="/_Inicio/_InvIngDB/ActualizaStock" element={<ActualizaStock />} />
          <Route path="/testdb" element={<TestDB />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route index element={<InicioSesion />} />
        </Routes>
        <Footer />
      </BrowserRouter>
    </PizzaProvider>
  );
}

export default App;
