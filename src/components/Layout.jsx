import { Outlet } from 'react-router-dom';


function Layout() {
  return (
    <div>
        <h1 className="PDCRL">Panel de Control / My_Backoffice</h1>
        <Outlet/>
    </div>
  )
}

export default Layout