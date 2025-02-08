import React, { useState, useContext, useEffect, useCallback, useMemo } from 'react';
import { format, formatDistanceToNow,  parseISO } from 'date-fns';
import _PizzaContext from './_PizzaContext.jsx';
import _MiniGrafico from '../../src/pages/_MiniGrafico';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/invDB.css'

const ActualizaStock = () => {
  const [inventario, setInventario] = useState([]);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [isDesenfocado, setIsDesenfocado] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [currentDisponible, setCurrentDisponible] = useState(0);
  const [currentLimite, setCurrentLimite] = useState(0);
  const [isFormVisible, setIsFormVisible] = useState(false);
  const [lastId, setLastId] = useState(100);
  const [categorias, setCategorias] = useState({
    Ingredientes: {
      Lacteos: [
        'Queso Mozz Fresca', 'Queso Burrata', 'Queso Fior Di Late', 'Mozzarella', 
        'Ricotta', 'Queso Cottage', 'Mascarpone', 'Queso Quark', 'Queso Feta', 
        'Queso Halloumi', 'Queso Brie', 'Queso Camembert', 'Queso Roquefort', 
        'Queso Gorgonzola', 'Queso Azul', 'Queso Parmesano', 'Queso Grana Padano', 
        'Queso Pecorino Romano', 'Queso Cheddar', 'Queso Gouda', 'Queso Edam', 
        'Queso Emmental', 'Queso Gruyère', 'Queso Manchego', 'Queso Idiazábal', 
        'Queso Provolone', 'Queso Reblochon', 'Queso Tête de Moine', 
        'Queso Cotija', 'Queso Oaxaca', 'Queso Chihuahua', 'Queso Panela', 
        'Queso Asiago', 'Queso Taleggio', 'Queso Caciocavallo', 'Queso Fontina', 
        'Queso Scamorza', 'Queso Crescenza', 'Queso Stracchino', 'Queso Boursin', 
        'Queso Fromage Blanc', 'Queso Saint Marcellin', 'Queso Cambozola', 
        'Queso Limburger', 'Queso Munster', 'Queso Neufchâtel', 'Queso Raclette', 
        'Queso Havarti', 'Queso Port Salut'
    ],
      'Fiambres y carnes': [
        'Peperonni', 'Chorizo', 'Bacon', 'Ternera', 'Jamon cocido', 
        'Salami', 'Jamon Serrano', 'Jamon Iberico', 'Panceta', 'Lomo Embuchado', 
        'Mortadela', 'Prosciutto', 'Capicola', 'Bresaola', 'Coppa', 'Lonzino', 
        'Cecina', 'Pastrami', 'Roast Beef', 'Pavo Ahumado', 'Pollo Asado', 
        'Salchichón', 'Fuet', 'Sobrasada', 'Longaniza', 'Butifarra', 'Cordero', 
        'Pato Confitado', 'Carrillera', 'Rabo de Toro', 'Pechuga de Pato', 
        'Costilla de Cerdo', 'Costilla de Res', 'Lacón', 'Caña de Lomo', 
        'Morcilla', 'Chistorra', 'Codillo de Cerdo', 'Tocino', 'Jamón de York', 
        'Pechuga de Pollo', 'Chuleta de Cerdo', 'Carne Picada de Ternera', 
        'Carne Picada de Cerdo', 'Salchicha Alemana', 'Salchicha de Pollo'
    ],
      Verduras: [
        'Albahaca', 'Rucula', 'Aceitunas Verdes', 'Aceitunas Negras', 'Champiñones', 'Cebolla', 
        'Pimiento Rojo', 'Pimiento Verde', 'Pimiento Amarillo', 'Tomate Cherry', 'Tomate Seco', 
        'Tomate en Rodajas', 'Espinaca', 'Berro', 'Lechuga', 'Col Rizada', 'Acelga', 
        'Zanahoria', 'Remolacha', 'Calabacín', 'Berenjena', 'Brocoli', 'Coliflor', 
        'Ajo', 'Jengibre', 'Cebolla Morada', 'Cebolla Caramelizada', 'Puerro', 
        'Pepino', 'Maíz Dulce', 'Hinojo', 'Nabo', 'Rábanos', 'Apio', 'Endibia', 
        'Setas Porcini', 'Setas Shiitake', 'Setas Portobello', 'Trufa Negra', 
        'Trufa Blanca', 'Judías Verdes', 'Guisantes', 'Alcachofa', 'Calabaza', 
        'Esparragos Verdes', 'Esparragos Blancos', 'Okra'
    ],
      Especias: [
        'Sal', 'Azucar', 'Pimienta', 'Oregano', 'Ajo en Polvo', 'Cebolla en Polvo', 
        'Comino', 'Curry', 'Paprika', 'Pimentón Dulce', 'Pimentón Ahumado', 
        'Nuez Moscada', 'Canela', 'Clavo de Olor', 'Jengibre en Polvo', 'Cilantro Seco', 
        'Hinojo', 'Anís Estrellado', 'Cardamomo', 'Cúrcuma', 'Mostaza en Polvo', 
        'Semillas de Mostaza', 'Albahaca Seca', 'Romero', 'Tomillo', 'Laurel', 
        'Estragón', 'Eneldo', 'Mejorana', 'Salvia', 'Ají Molido', 'Chile en Polvo', 
        'Pimienta Blanca', 'Pimienta Rosa', 'Pimienta Verde', 'Pimienta Negra', 
        'Sésamo', 'Semillas de Amapola', 'Fenogreco', 'Sumac', 'Ras el Hanout', 
        'Garam Masala', 'Za’atar', 'Curry en Pasta', 'Wasabi en Polvo', 'Vainilla en Polvo'
    ],
      Salsas: [
        'Salsa Tomate Pizza', 'Salsa Barbacoa', 'Salsa Pesto', 'Salsa Pecorino', 
        'Salsa Alfredo', 'Salsa Bechamel', 'Salsa de Queso Azul', 'Salsa de Yogur', 
        'Salsa de Mostaza y Miel', 'Salsa de Ajo', 'Salsa de Trufa', 'Salsa Romesco', 
        'Salsa Carbonara', 'Salsa Napolitana', 'Salsa Arrabbiata', 'Salsa Pomodoro', 
        'Salsa Marinara', 'Salsa de Champiñones', 'Salsa de Pimienta', 'Salsa Mornay', 
        'Salsa Tzatziki', 'Salsa de Albahaca', 'Salsa de Rúcula', 'Salsa de Estragón', 
        'Salsa Harissa', 'Salsa Chimichurri', 'Salsa Guacamole', 'Salsa Tapenade', 
        'Salsa de Mango y Curry', 'Salsa de Soja', 'Salsa Teriyaki', 'Salsa Hoisin', 
        'Salsa Ponzu', 'Salsa de Ostras', 'Salsa Worcestershire', 'Salsa Sweet Chili', 
        'Salsa Agridulce', 'Salsa Ranch', 'Salsa César', 'Salsa Thousand Island', 
        'Salsa de Chipotle', 'Salsa Picante', 'Salsa Sriracha', 'Salsa de Tamarindo'
    ],
      Frutas: [
        'Piña', 'Coco', 'Manzana', 'Pera', 'Plátano', 'Fresa', 'Frambuesa', 
        'Mora', 'Arándanos', 'Uva', 'Cereza', 'Melocotón', 'Albaricoque', 
        'Ciruela', 'Mango', 'Papaya', 'Kiwi', 'Maracuyá', 'Granada', 
        'Higo', 'Dátil', 'Guayaba', 'Mandarina', 'Naranja', 'Pomelo', 
        'Limón', 'Lima', 'Melón', 'Sandía', 'Chirimoya', 'Litchi', 
        'Tamarindo', 'Carambola', 'Pitahaya', 'Membrillo'
    ],
      Pescado: [
        'Atún', 'Anchoas', 'Salmón', 'Bacalao', 'Trucha', 'Merluza', 'Sardinas', 
        'Jurel', 'Caballa', 'Lubina', 'Dorada', 'Róbalo', 'Pez Espada', 'Lenguado', 
        'Abadejo', 'Rodaballo', 'Mero', 'Corvina', 'Raya', 'Palometa', 'Anguila', 
        'Pargo', 'Bonito', 'Arenque', 'Halibut', 'Esturión', 'Tilapia', 'Barramundi', 
        'Pez Gato', 'Carpa', 'Marrajo', 'Pez Mahi-Mahi', 'Calamar', 'Pulpo', 'Sepia', 'Choco', 'Mejillones', 'Almejas', 
        'Ostras', 'Vieiras', 'Navajas', 'Erizo de Mar', 'Conchas Finas', 
        'Caracol de Mar', 'Percebes', 'Langosta', 'Bogavante', 'Cangrejo', 'Buey de Mar', 'Camarones', 
        'Gambas', 'Langostinos', 'Carabinero', 'Quisquilla', 'Cigala'
    ],
    },
    Partner: {
      Complementos: {
        Complementos: [
          'Pan de Ajo', 'Lasaña', 'Calzone Dulce', 'Ensalada', 'Bruschetta', 
          'Focaccia', 'Pan de Queso', 'Palitos de Mozzarella', 'Croquetas de Queso', 
          'Bolitas de Queso Frito', 'Pan Tumaca', 'Tosta de Jamón y Queso', 'Panini', 
          'Empanadas', 'Rollitos de Primavera', 'Arancini', 'Patatas Bravas', 
          'Patatas Gajo', 'Papas Fritas', 'Yuca Frita', 'Nachos con Queso', 'Guacamole', 
          'Hummus', 'Baba Ganoush', 'Queso Fundido', 'Tortilla de Patatas', 
          'Pimientos del Padrón', 'Alcachofas al Horno', 'Champiñones Rellenos', 
          'Ensalada Caprese', 'Ensalada César', 'Tabulé', 'Coleslaw', 
          'Ratatouille', 'Crema de Calabaza', 'Sopa Minestrone', 'Gazpacho', 
          'Carpaccio de Ternera', 'Carpaccio de Salmón', 'Brochetas de Pollo', 
          'Brochetas de Verduras', 'Fondue de Queso', 'Tzatziki con Pan Pita'
      ],
      },
      Bebidas: {
        Agua: [
          'Agua 200ml', 'Agua 500ml', 'Agua 1L', 'Agua con Gas', 'Agua sin Gas', 
          'Agua Mineral', 'Agua Purificada', 'Agua de Manantial', 'Agua Alcalina', 
          'Agua con Electrolitos', 'Agua de Coco', 'Agua Tónica', 'Agua Aromatizada', 
          'Agua con Limón', 'Agua con Pepino', 'Agua con Hierbas', 'Agua con Jengibre'
      ],
        Vinos: [
          'Lambrusco', 'Chianti', 'Barolo', 'Brunello di Montalcino', 'Montepulciano', 
          'Sangiovese', 'Nero d’Avola', 'Valpolicella', 'Prosecco', 'Franciacorta', 
          'Asti Spumante', 'Amarone', 'Cabernet Sauvignon', 'Merlot', 'Pinot Noir', 
          'Syrah', 'Malbec', 'Tempranillo', 'Garnacha', 'Rioja', 'Ribera del Duero', 
          'Albariño', 'Verdejo', 'Godello', 'Chardonnay', 'Sauvignon Blanc', 'Viognier', 
          'Gewürztraminer', 'Riesling', 'Moscato', 'Vino Rosado', 'Cava', 'Champagne', 
          'Porto', 'Shiraz', 'Zinfandel', 'Carmenere', 'Vino de Jerez', 'Marsala'
      ],
        Cerveza: [
          'Lager', 'Pilsner', 'Helles', 'Dunkel', 'Bock', 'Doppelbock', 'Märzen', 
          'Kölsch', 'Altbier', 'Pale Ale', 'Indian Pale Ale (IPA)', 'New England IPA (NEIPA)', 
          'Amber Ale', 'Brown Ale', 'Porter', 'Stout', 'Oatmeal Stout', 'Imperial Stout', 
          'Barleywine', 'Scottish Ale', 'Red Ale', 'Witbier', 'Weissbier', 'Hefeweizen', 
          'Dunkelweizen', 'Kristallweizen', 'Tripel', 'Dubbel', 'Quadrupel', 'Saison', 
          'Gose', 'Lambic', 'Berliner Weisse', 'Flanders Red Ale', 'Rauchbier', 
          'Black IPA', 'Milk Stout', 'Braggot', 'Cream Ale', 'Grisette'
      ],
        Refrescos: [
          'Refresco de Cola', 'Refresco de Naranja', 'Refresco de Limón', 'Refresco de Manzana', 
          'Refresco de Uva', 'Refresco de Piña', 'Refresco de Maracuyá', 'Refresco de Mango', 
          'Refresco de Toronja', 'Refresco de Lima-Limón', 'Refresco de Fresa', 'Refresco de Frutas Tropicales', 
          'Refresco de Granada', 'Refresco de Melocotón', 'Refresco de Frambuesa', 'Refresco de Cereza', 
          'Refresco de Guayaba', 'Refresco de Mora', 'Refresco de Mandarina', 'Refresco de Coco', 
          'Refresco de Jengibre', 'Refresco de Tamarindo', 'Refresco de Hibisco', 'Refresco de Aloe Vera', 
          'Refresco de Té Negro', 'Refresco de Té Verde', 'Refresco de Té Rojo', 'Refresco de Mate', 
          'Refresco de Café', 'Refresco de Soda Tónica', 'Refresco de Soda con Limón', 
          'Refresco de Soda de Frutas', 'Refresco de Malta'
      ],
      },
      Postres: {
        Helados: ['Chocolate', 'Coco', 'Vainilla', 'Fresa', 'Dulce de Leche', 'Pistacho', 'Avellana', 
          'Mango', 'Limón', 'Frambuesa', 'Stracciatella', 'Cookies and Cream', 'Menta con Chocolate'],
        Tarta: ['Tarta de Queso', 'Tarta de Manzana', 'Tarta de Chocolate', 'Tarta de Frutas', 
          'Tarta de Zanahoria', 'Tarta de Almendras', 'Tarta de Limón', 'Tarta de Fresa', 
          'Tarta de Coco', 'Tarta de Nuez', 'Tarta de Frambuesa'],
        Pasteles:['Pastel de Tres Leches', 'Pastel de Chocolate', 'Pastel de Vainilla', 'Pastel de Red Velvet', 
          'Pastel de Zanahoria', 'Pastel de Avellanas', 'Pastel de Café', 'Pastel de Coco'],
        Galletas:['Galletas de Mantequilla', 'Galletas de Chocolate', 'Galletas de Avena', 'Galletas de Jengibre', 
          'Galletas con Chispas de Chocolate', 'Galletas de Almendras', 'Galletas de Canela'],
        'Flanes y Pudines':['Flan de Vainilla', 'Flan de Coco', 'Flan de Queso', 'Pudín de Chocolate', 
          'Pudín de Pan', 'Pudín de Chía', 'Pudín de Arroz'],
        'Dulces Fritos':['Churros', 'Buñuelos', 'Donas', 'Torrijas', 'Pestiños'],
        'Postres Fríos':['Tiramisú', 'Panna Cotta', 'Mousse de Chocolate', 'Mousse de Maracuyá', 
          'Natillas', 'Arroz con Leche', 'Crema Catalana'],
        'Frutas Confitadas':['Manzanas Caramelizadas', 'Fresas con Chocolate', 'Plátanos Flambeados', 
          'Piña Asada con Canela', 'Brochetas de Frutas con Miel']
      },
    },
    Publicidad: {
      Branding: [
        'Bolsas de Papel', 'Cartón Porciones', 'Cajas Personalizadas', 'Servilletas con Logo', 
        'Manteles de Papel Personalizados', 'Stickers Promocionales', 'Cintas Adhesivas con Marca', 
        'Etiquetas Personalizadas', 'Sellos con Logo', 'Vasos de Cartón Personalizados', 
        'Bandejas de Cartón con Marca', 'Cajas para Delivery con Logo'
    ],
    'Material Impreso': [
        'Folletos Promocionales', 'Tarjetas de Presentación', 'Menús Impresos', 
        'Volantes Publicitarios', 'Postales con Ofertas', 'Posters para Local', 
        'Cupones de Descuento Impresos', 'Flyers con Promociones', 'Imanes para Nevera'
    ],
    Merchandising: [
        'Camisetas con Logo', 'Gorras Personalizadas', 'Llaveros con Marca', 
        'Botellas Reutilizables con Logo', 'Delantales con Logo', 'Bolsos de Tela Personalizados', 
        'Posavasos con Logo', 'Imanes para Nevera con Marca', 'Calendarios Personalizados'
    ],
    'Decoración y Señalización': [
        'Vinilos para Ventanas', 'Letreros Luminosos', 'Carteles con Promociones', 
        'Banderines Publicitarios', 'Pizarras con Ofertas', 'Displays para Mostrador', 
        'Tótems Publicitarios', 'Rótulos en el Punto de Venta', 'Paneles de LED con Promociones'
    ],
    'Publicidad en Eventos': [
        'Patrocinio de Eventos Locales', 'Carpas Personalizadas', 'Globos con Logo', 
        'Photocalls con Marca', 'Stands de Exhibición', 'Muestras Gratuitas', 
        'Sorteos y Concursos', 'Tarjetas Raspa y Gana'
    ]
    },
    Papeleria: {
      MaterialOficina: [
        'Bolígrafos', 'Lápices', 'Portaminas', 'Rotuladores', 'Marcadores Permanentes', 
        'Subrayadores', 'Gomas de Borrar', 'Sacapuntas', 'Correctores Líquidos', 
        'Cinta Adhesiva', 'Tijeras', 'Cutter', 'Pegamento en Barra', 'Pegamento Líquido', 
        'Clips para Papel', 'Grapadora', 'Grapas', 'Perforadora de Hojas', 
        'Cinta Correctora', 'Reglas', 'Compás', 'Escuadra y Cartabón'
    ],
    'Papel y Cuadernos': [
        'Cuadernos de Rayas', 'Cuadernos Cuadriculados', 'Cuadernos en Blanco', 
        'Libretas de Notas', 'Blocks de Dibujo', 'Papel Bond', 'Papel Reciclado', 
        'Papel Fotográfico', 'Papel Perforado', 'Post-it', 'Agendas', 
        'Diarios de Notas', 'Planificadores Semanales'
    ],
    Organización: [
        'Archivadores', 'Carpetas de Plástico', 'Carpetas de Cartón', 
        'Separadores de Carpetas', 'Fundas Plásticas', 'Sobres de Papel', 
        'Sobres de Burbuja', 'Clipboards', 'Cajas Organizadoras', 'Bandejas para Documentos'
    ],
    'Material de Impresión': [
        'Cartuchos de Tinta', 'Tóner para Impresora', 'Resmas de Papel', 
        'Papel Fotográfico', 'Papel para Plotter', 'Papel Termosensible', 
        'Rollos de Etiquetas', 'Papel Transfer para Textil'
    ],
    },
    'Seguridad y Emergencia': {
      'Equipo de Seguridad': [
        'Kits de primeros auxilios', 'Extintores', 'Botiquín de emergencia', 
        'Guantes de seguridad', 'Gafas de protección', 'Cascos de seguridad', 
        'Máscaras de protección', 'Protectores auditivos', 'Chalecos reflectantes', 
        'Calzado de seguridad', 'Rodilleras y coderas', 'Señalización de seguridad'
    ],

    'Prevención de Incendios': [
        'Extintores de polvo químico', 'Extintores de CO2', 'Extintores de espuma', 
        'Detectores de humo', 'Alarmas contra incendios', 'Rociadores automáticos', 
        'Mantas ignífugas', 'Hidrantes y mangueras contra incendios', 'Señalización de salida de emergencia'
    ],

    'Iluminación de Emergencia': [
        'Linternas recargables', 'Lámparas de emergencia', 'Luces estroboscópicas', 
        'Balizas de señalización', 'Luces de emergencia para salidas', 
        'Reflectores de seguridad', 'Cintas reflectantes'
    ],
    'Equipos de Evacuación': [
        'Plan de evacuación', 'Salidas de emergencia señalizadas', 'Puntos de reunión', 
        'Escaleras de evacuación', 'Megáfonos y sistemas de aviso', 'Camillas de evacuación', 
        'Chalecos salvavidas', 'Máscaras de escape de humo'
    ],

    'Protección Personal': [
        'Mascarillas de protección respiratoria', 'Filtros de aire', 'Ropa ignífuga', 
        'Arneses de seguridad', 'Cinturones de sujeción', 'Protección antiestática'
    ],

    'Suministros de Emergencia': [
        'Radio de emergencia', 'Pilas y baterías de repuesto', 'Alimentos no perecederos', 
        'Bidones de agua potable', 'Silbatos de emergencia', 'Cuerda de rescate', 
        'Multiherramientas', 'Sacos de dormir térmicos'
    ]
    },
    Limpieza: {
      'Detergentes': [
        'FriegaSuelos', 'Detergente para Ropa', 'Detergente para Vajilla', 
        'Lavavajillas Líquido', 'Jabón en Polvo', 'Jabón Neutro', 
        'Desengrasante', 'Quitamanchas', 'Limpiador Multiusos', 
        'Limpiador Antibacterial', 'Limpiador de Baños', 'Limpiador de Cristales', 
        'Limpiador de Superficies de Madera', 'Limpiador de Acero Inoxidable'
    ],

    'Herramientas de Limpieza': [
        'Esponjas', 'Bayetas de Microfibra', 'Fregonas', 'Mopas', 
        'Cepillos de Cerdas Duras', 'Cepillos para Baño', 'Estropajos', 
        'Plumeros', 'Guantes de Goma', 'Panos Absorbentes', 'Trapos de Algodón', 
        'Rasquetas para Cristales', 'Bolsas para Basura', 'Paños Desinfectantes'
    ],

    Desinfectantes: [
        'Alcohol en Gel', 'Alcohol Etílico', 'Cloro', 'Lejía', 
        'Agua Oxigenada', 'Amoniaco', 'Desinfectante Multiusos', 
        'Desinfectante para Baños', 'Desinfectante para Superficies', 
        'Toallitas Desinfectantes', 'Bactericidas y Fungicidas'
    ],
    'Ambientadores y Control de Olores': [
        'Ambientador en Aerosol', 'Ambientador en Gel', 'Velas Aromáticas', 
        'Inciensos', 'Sprays Neutralizadores de Olores', 'Difusores de Aromas', 
        'Bolsas Aromáticas', 'Pastillas Ambientadoras para Baño'
    ],

    'Papel y Desechables': [
        'Papel Higiénico', 'Servilletas de Papel', 'Toallas de Papel', 
        'Pañuelos Desechables', 'Papel de Cocina', 'Rollos Industriales de Papel', 
        'Bolsas de Basura Biodegradables'
    ]
    },
    'Ropa de Trabajo y Protección': {
      'Uniformes': [
        'Mandilones', 'Camiseta', 'Pantalón de Trabajo', 'Chaqueta de Trabajo', 
        'Overol', 'Bata de Laboratorio', 'Chaleco de Trabajo', 'Polo de Trabajo', 
        'Sudadera de Trabajo', 'Delantal de Cocina', 'Pantalón Antidesgarro', 
        'Conjunto de Uniforme Industrial', 'Ropa de Trabajo Ignífuga'
    ],

    'Calzado de Seguridad': [
        'Botas de Seguridad con Puntera de Acero', 'Zapatos Antideslizantes', 
        'Zapatillas de Seguridad', 'Botas Impermeables', 'Calzado Dieléctrico', 
        'Calzado Antiperforación', 'Botas de Caucho para Químicos'
    ],

    'Accesorios de Protección': [
        'Guantes de Trabajo', 'Guantes Resistentes al Calor', 'Guantes Anticorte', 
        'Gafas de Protección', 'Máscaras de Seguridad', 'Protectores Auditivos', 
        'Cascos de Seguridad', 'Rodilleras de Trabajo', 'Coderas de Protección', 
        'Faja Lumbar de Soporte', 'Chaleco Reflectante', 'Bufanda Térmica', 
        'Pasamontañas de Seguridad'
    ],
    'Ropa de Alta Visibilidad': [
      'Chaleco Reflectante', 'Pantalón Reflectante', 'Chaqueta de Alta Visibilidad', 
      'Mono de Alta Visibilidad', 'Gorra con Reflectante'
  ],

  'Ropa Impermeable': [
      'Traje de Agua', 'Chaqueta Impermeable', 'Pantalón Impermeable', 
      'Poncho de Trabajo', 'Buzo Impermeable'
  ]

    },
    Herramientas: {
     'Herramientas Menores': [
        'Palas de Pizza', 'Cortadores de Pizza', 'Rodillos para Masa', 
        'Espátulas', 'Pinzas de Cocina', 'Cuchillos Profesionales', 
        'Tijeras de Cocina', 'Raspadores de Masa', 'Moldes para Pizza', 
        'Termómetros de Cocina', 'Cucharones', 'Mazas para Amasar', 
        'Rejillas para Enfriar', 'Tamices para Harina', 'Cepillos para Horno'
    ],

    'Equipamiento de Cocina': [
        'Hornos de Pizza', 'Batidoras Industriales', 'Laminadoras de Masa', 
        'Fermentadoras', 'Ralladores de Queso', 'Básculas de Cocina', 
        'Prensas para Panini', 'Planchas para Cocción', 'Freidoras Industriales', 
        'Sartenes de Hierro Fundido', 'Moldes para Pan', 'Dispensadores de Harina'
    ],

    'Herramientas de Limpieza': [
        'Cepillos para Hornos', 'Rasquetas de Superficie', 'Cubos de Agua', 
        'Trapos Absorbentes', 'Esponjas Abrasivas', 'Pistolas de Agua a Presión', 
        'Escobas Industriales', 'Fregonas', 'Bayetas Microfibra'
    ],
    'Herramientas de Mantenimiento': [
        'Llaves Inglesas', 'Destornilladores', 'Alicates', 'Martillos', 
        'Llaves Allen', 'Cintas de Teflón', 'Lubricantes para Máquinas', 
        'Multímetros', 'Silicona Selladora', 'Cuchillas de Repuesto', 
        'Brochas para Engrasar'
    ]
    },
    Otro: {
      'Cajas de Pizza': [
        'Cajas de Pizza S', 'Cajas de Pizza M', 'Cajas de Pizza L', 
        'Cajas de Pizza XL', 'Cajas de Pizza XXL', 'Cajas para Pizza Personal', 
        'Cajas para Pizza por Porción', 'Cajas de Pizza Biodegradables', 
        'Cajas de Pizza con Ventana', 'Cajas de Pizza con Separadores'
    ],

    'Accesorios para Delivery': [
        'Bolsas Térmicas para Pizza', 'Sellos de Seguridad para Delivery', 
        'Portavasos de Cartón', 'Bandejas para Delivery', 'Bolsas de Papel Kraft', 
        'Cajas de Transporte para Ingredientes', 'Envases para Salsas', 
        'Servilletas Personalizadas', 'Cintas Adhesivas con Logo'
    ],

    'Utensilios Adicionales': [
        'Platos Desechables', 'Vasos de Cartón', 'Cubiertos de Madera', 
        'Palillos de Madera', 'Pajillas Biodegradables', 'Moldes para Pan', 
        'Bandejas para Hornear', 'Soportes para Caja de Pizza'
    ],

    'Otros Equipos': [
        'Relojes de Cocina', 'Temporizadores', 'Básculas de Precisión', 
        'Cajas Registradoras', 'Impresoras de Tickets', 'Cámaras de Seguridad', 
        'Sistemas de Gestión de Pedidos', 'Etiquetadoras'
    ]
    },

  });
  const [nuevoIngrediente, setNuevoIngrediente] = useState({
    categoria: '',
    subcategoria: '',
    producto: '',
    disponible: 0,
    // limite: 0,
    unidadMedida: '',
    referencia: '',
  });
  const [productosFiltrados, setProductosFiltrados] = useState([]);
  const [filtrosubcategoria, setFiltrosubcategoria] = useState('Todos');
  const [ubicacionSeleccionada, setUbicacionSeleccionada] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [inventarioFinal, setInventarioFinal] = useState([]);
  const [inventarioFiltrado, setInventarioFiltrado] = useState([]);
  const [fechaCaducidad, setFechaCaducidad] = useState(new Date());
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [subcategoriaSeleccionada, setSubcategoriaSeleccionada] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [currentFechaCaducidad, setCurrentFechaCaducidad] = useState(new Date());
  const [terminoBusqueda, setTerminoBusqueda] = useState('');
  const [inventarioOriginal, setInventarioOriginal] = useState([]);
  const [esOrdenAlfabetico, setEsOrdenAlfabetico] = useState(false);


useEffect(() => {
    axios.get('http://localhost:3001/inventario')
         .then(response => {
             setInventario(response.data.data); 
             setInventarioOriginal(response.data.data)
            //  console.log(response.data.data)
         })
         .catch(error => {
             console.error('Hubo un error obteniendo los datos:', error);
         });
}, []);
useEffect(() => {
  // Comienza con el inventario completo
  let resultados = [...inventario];

  // Aplicar filtros de subcategoría
  if (filtrosubcategoria !== 'Todos') {
    resultados = resultados.filter(item => item.subcategoria === filtrosubcategoria);
  }

  // Aplicar filtros de ubicación
  if (ubicacionSeleccionada && ubicacionSeleccionada !== 'ver todas') {
    resultados = resultados.filter(item => item.ubicacion === ubicacionSeleccionada);
  }

  // Aplicar filtros de estado
  if (filtroEstado) {
    resultados = resultados.filter(item => item.estado.toString() === filtroEstado);
  }

  // Aplicar filtros de categoría
  if (categoriaSeleccionada) {
    resultados = resultados.filter(item => item.categoria === categoriaSeleccionada);
  }

  // Aplicar búsqueda por término
  if (terminoBusqueda) {
    resultados = resultados.filter(item =>
      item.producto.toLowerCase().includes(terminoBusqueda.toLowerCase())
    );
  }

  // Ordenar alfabéticamente si está activo
  if (esOrdenAlfabetico) {
    resultados.sort((a, b) => a.producto.localeCompare(b.producto));
  }

  // Actualizar el estado final con los resultados filtrados y ordenados
  setInventarioFinal(resultados);

}, [
  inventario, 
  filtrosubcategoria, 
  ubicacionSeleccionada, 
  filtroEstado, 
  categoriaSeleccionada, 
  esOrdenAlfabetico, 
  terminoBusqueda
]);

const handleChange = (e) => {
  const { name, value } = e.target;
  setNuevoIngrediente(prev => ({
      ...prev,
      [name]: name === 'disponible'  ? Number(value) : value
  }));
}
const agregarIngrediente = async (e) => {
  e.preventDefault();
  const { categoria, subcategoria, producto, disponible, unidadMedida, referencia } = nuevoIngrediente;
  const nuevoDisponible = Number(disponible);
  const ultimaModificacion = new Date().toISOString();

  const ingredienteParaEnviar = {
    categoria,
    subcategoria,
    producto,
    disponible: nuevoDisponible,
    unidadMedida,
    estadoForzado: false,
    fechaCaducidad: currentFechaCaducidad.toISOString(),
    referencia,
    ultimaModificacion
  };

  try {
    // Intentamos agregar el ingrediente al inventario
    const responseInventario = await fetch("http://localhost:3001/inventario", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ingredienteParaEnviar)
    });

    const dataInventario = await responseInventario.json();
    if (!responseInventario.ok) throw new Error(dataInventario.error);

    // ⚠️ Verifica si dataInventario.data tiene IDI y IDR
    if (!dataInventario.data.IDI || !dataInventario.data.IDR) {
      throw new Error("El servidor no devolvió IDI o IDR correctamente.");
    }

    // ✅ Asegurar que el estado incluya IDI e IDR correctamente
    setInventario(prevInventario => [
      ...prevInventario,
      { 
        ...ingredienteParaEnviar, 
        IDR: dataInventario.data.IDR, 
        IDI: dataInventario.data.IDI  // Agregamos IDI
      }
    ]);

    // Reiniciamos el formulario y cerramos el modal o form
    setNuevoIngrediente({
      categoria: '',
      subcategoria: '',
      producto: '',
      disponible: 0,
      unidadMedida: '',
      referencia: '',
    });
    setMostrarFormulario(false);
    setIsDesenfocado(false);

  } catch (error) {
    console.error("❌ Error al añadir ingrediente al servidor:", error);
    alert(`Error al añadir ingrediente al servidor: ${error.message}`);
  }
};
const showForm = (IDR, disponible, fechaCaducidadStr) => {
  setCurrentId(IDR);
  setCurrentDisponible(disponible);
 

  if (fechaCaducidadStr) {
    const fecha = new Date(fechaCaducidadStr);
    if (!isNaN(fecha.getTime())) {
      setCurrentFechaCaducidad(fecha);
    } else {
      console.error('La fecha de caducidad proporcionada no es válida:', fechaCaducidadStr);
      setCurrentFechaCaducidad(new Date(fechaCaducidadStr)); 
    }
  } else {
    console.error('No se proporcionó fecha de caducidad.');
    setCurrentFechaCaducidad(new Date(fechaCaducidadStr)); 
  }

  setIsFormVisible(true);
}
const modificarIngrediente = async (IDR, IDI, nuevoProducto, nuevaUnidadMedida, currentDisponible, currentFechaCaducidad) => {
  const nuevaFechaCaducidad = currentFechaCaducidad.toISOString();
  const ultimaModificacion = new Date().toISOString();
  const nuevoDisponible = Number(currentDisponible);

  if (isNaN(nuevoDisponible)) {
    alert("El valor de disponible no es válido.");
    return;
  }

  if (!(currentFechaCaducidad instanceof Date && !isNaN(currentFechaCaducidad.getTime()))) {
    alert("La fecha de caducidad no es válida.");
    return;
  }

  const objetoParaEnviar = {
    disponible: nuevoDisponible,
    fechaCaducidad: nuevaFechaCaducidad,
    ultimaModificacion
  };

  try {
    // Actualizar en inventario
    const responseInventario = await fetch(`http://localhost:3001/inventario/${IDR}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(objetoParaEnviar)
    });

    if (!responseInventario.ok) {
      const errorData = await responseInventario.json();
      throw new Error(errorData.error || 'Error al actualizar el ingrediente en el inventario');
    }

    // Actualizar en ranking_ingredientes
    const responseRanking = await fetch(`http://localhost:3001/ranking/actualizar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ IDI, producto: nuevoProducto, unidadMedida: nuevaUnidadMedida })
    });

    if (!responseRanking.ok) {
      const errorData = await responseRanking.json();
      throw new Error(errorData.error || 'Error al actualizar el ingrediente en el ranking');
    }

    // Actualizar el estado
    setInventario(prevInventario =>
      prevInventario.map(ingrediente => (ingrediente.IDR === IDR ? { ...ingrediente, ...objetoParaEnviar } : ingrediente))
    );

    alert('Ingrediente modificado con éxito');
  } catch (error) {
    console.error('Error al modificar el ingrediente:', error);
    alert('Error al modificar el ingrediente: ' + error.message);
  }
};
const abrirFormulario = () => {
  setMostrarFormulario(true);
  setIsDesenfocado(true);
};
const cerrarFormulario = () => {
  setMostrarFormulario(false);
  setIsDesenfocado(false);
};
const eliminarIngrediente = (IDR) => {
  const esConfirmado = window.confirm("¿Estás seguro de que quieres eliminar este ingrediente?");
  if (!esConfirmado) return;

  axios.delete(`http://localhost:3001/inventario/eliminar/${IDR}`)
    .then(response => {
      if (response.status === 200) {
        setInventario(prev => prev.filter(ingrediente => ingrediente.IDR !== IDR));
        console.log("✅ Ingrediente eliminado correctamente:", response.data);
      } else {
        console.warn("⚠️ Advertencia: No se encontró el ingrediente en el servidor.");
      }
    })
    .catch(error => {
      console.error("❌ Error al eliminar el ingrediente:", error);
      alert(`Error al eliminar el ingrediente: ${error.message}`);
    });
};
const calcularConsumoU7D = () => {
  // Genera un valor aleatorio entre 1 y 1000 como consumo
  return Math.floor(Math.random() * 1000) + 1;
};
const handleUbicacionChange = (e) => {
    setUbicacionSeleccionada(e.target.value);
};
const calcularInventarioTotal = () => {
  return inventario.reduce((total, ingrediente) => total + ingrediente.disponible, 0);
};
const handleCategoriaChange = (e) => {
  const nuevaCategoriaSeleccionada = e.target.value;
  setCategoriaSeleccionada(nuevaCategoriaSeleccionada);
  setNuevoIngrediente(prev => ({
    ...prev,
    categoria: nuevaCategoriaSeleccionada // Asegúrate de actualizar la categoría aquí
  }));
};
const handleSubcategoriaChange = (e) => {
  const nuevaSubcategoriaSeleccionada = e.target.value;
  setSubcategoriaSeleccionada(nuevaSubcategoriaSeleccionada);
  setNuevoIngrediente(prev => ({
    ...prev,
    subcategoria: nuevaSubcategoriaSeleccionada
  }));
};
const handleProductoChange = (e) => {
  const nuevoProductoSeleccionado = e.target.value;
  setProductoSeleccionado(nuevoProductoSeleccionado);
  setNuevoIngrediente(prev => ({
    ...prev,
    producto: nuevoProductoSeleccionado
  }));
};
const handleUnidadMedidaChange = (e) => {
  const nuevaUnidadMedida = e.target.value;
  setNuevoIngrediente((prevIngrediente) => ({
    ...prevIngrediente,
    unidadMedida: nuevaUnidadMedida,
  }));
};
const handleEstadoChange = (e) => {
setFiltroEstado(e.target.value);
};
const formatearFecha = (fecha) => {
  if (!fecha) {
    return 'No aplica';
  }
  const fechaObj = new Date(fecha);
  if (isNaN(fechaObj.getTime())) {
    return 'Fecha inválida';
  }
  return format(fechaObj, 'dd/MM/yyyy');
};
const formatearUltimaModificacion = (timestampISO) => {
 
  if (!timestampISO) {
    return 'No aplica';
  }
  
  if (timestampISO === 'Fecha no válida') {
    return timestampISO;
  }

  try {
    const fecha = parseISO(timestampISO);
    if (isNaN(fecha)) {
      return 'Fecha no válida';
    }
    return formatDistanceToNow(fecha, { addSuffix: true });
  } catch (error) {
    console.error('Error al formatear la fecha:', error);
    return 'Error de formato';
  }
};
const toggleOrdenAlfabetico = () => {
  if (!esOrdenAlfabetico) {
    const inventarioOrdenado = [...inventario].sort((a, b) => a.producto.localeCompare(b.producto));
    setInventarioFinal(inventarioOrdenado);
  } else {
    setInventarioFinal(inventario);
  }
  setEsOrdenAlfabetico(!esOrdenAlfabetico); // Cambia el estado de orden alfabético
};
const handleSearchChange = (event) => {
  setTerminoBusqueda(event.target.value);
};

const inventarioFiltrados = useMemo(() => {
  // Asegúrate de que 'inventario' esté definido y no sea nulo o indefinido.
  if (!inventario) {
    return [];
  }

  // Realiza el filtrado y retorna el nuevo array filtrado
  return inventario.filter(item => {
    return filtrosubcategoria === 'Todos' || item.subcategoria === filtrosubcategoria;
  });
}, [inventario, filtrosubcategoria]); // Dependencias de useMemo
const inventarioFiltradoPorProducto = inventarioFiltrados.filter(inventario => {
  if (productoSeleccionado === 'ver todos') {
    return true; // No aplica ningún filtro, muestra todos los productos
  }
  return inventario.nombreProducto === productoSeleccionado; // Filtra basado en el producto seleccionado
});
const inventarioFiltradosPorEstado = inventarioFiltrados.filter(inventario => {
  // Si 'filtroEstado' es una cadena vacía, no se aplica ningún filtro y todos los ítems pasan.
  if (filtroEstado === "") {
    return true;
  }
  const estadoBooleano = filtroEstado === "true";
  return inventario.estado === estadoBooleano;
});


return (
      <div className="contenido-principal">
      <h2 className="Titulo">Gestión del Inventario</h2>
      <div>
      <div className='Filtros'>
          <button 
              className="boton-dashboard"
              onClick={() => window.location.href='http://localhost:3000/_Inicio/_InvIngDB'}>
              Ir al Dashboard
          </button>
          <button 
            className="boton-agregar"
            onClick={abrirFormulario}>
            Agregar Producto!
          </button>
          <button 
          className="boton-agregar"  
          onClick={toggleOrdenAlfabetico}>
            {esOrdenAlfabetico ? "Restablecer" : "Ordenar A-Z"}
          </button>
          <select  
          className="Filtro1" 
          onChange={handleUbicacionChange} 
          value={ubicacionSeleccionada}>
            <option value="">Seleccione Ubicación</option>
            <option value="mi ubicacion actual">Mi ubicación actual</option>
            <option value="ubicacion 1">Ubicación 1</option>
            <option value="ubicacion 2">Ubicación 2</option>
            <option value="ver todas">Ver todas</option>
          </select>
          <select 
          className="Filtro1"  
          onChange={handleCategoriaChange} 
          value={categoriaSeleccionada}>
            <option value="">Seleccione Categorias</option>
            {Object.keys(categorias).map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
          <div >
            <input
              type="text"
              placeholder="¡Buscador de Productos!"
              className="buscador-productos"
              onChange={handleSearchChange}
              value={terminoBusqueda}
              style={{
                padding: '15px 50px',
              }}
            />
         <button 
        className="boton-escaneo"
        >
        📷 Escanear Código
        </button>

          </div>
 
      </div>
      
          {mostrarFormulario && (
              <div className={`overlay ${mostrarFormulario ? 'visible' : ''}`}>
                  <form 
                    className='formulario-agregar'
                    onSubmit={agregarIngrediente}
                    onClick={(e) => e.stopPropagation()}
                    >
                       <label>
                    Categoria:
                    <select name="categoria" value={categoriaSeleccionada} onChange={handleCategoriaChange}>
                      <option value="">Seleccione una categoría</option>
                      {Object.keys(categorias).map((categoria) => (
                        <option key={categoria} value={categoria}>{categoria}</option>
                      ))}
                    </select>
                  </label>

                  {categoriaSeleccionada && (
                    <label>
                      Subcategoria:
                      <select name="subcategoria" value={subcategoriaSeleccionada} onChange={handleSubcategoriaChange}>
                        <option value="">Seleccione una subcategoría</option>
                        {categorias[categoriaSeleccionada] && Object.keys(categorias[categoriaSeleccionada]).map((subcategoria) => (
                          <option key={subcategoria} value={subcategoria}>{subcategoria}</option>
                        ))}
                      </select>
                    </label>
                  )}

                  {subcategoriaSeleccionada && (
                    <label>
                      Producto:
                      <select name="producto" value={productoSeleccionado} onChange={handleProductoChange}>
                        <option value="">Seleccione un producto</option>
                        {Array.isArray(categorias[categoriaSeleccionada][subcategoriaSeleccionada]) ?
                          categorias[categoriaSeleccionada][subcategoriaSeleccionada].map((producto) => (
                            <option key={producto} value={producto}>{producto}</option>
                          )) :
                          Object.keys(categorias[categoriaSeleccionada][subcategoriaSeleccionada]).map((key) => (
                            categorias[categoriaSeleccionada][subcategoriaSeleccionada][key].map((producto) => (
                              <option key={producto} value={producto}>{producto}</option>
                            ))
                          ))
                        }
                      </select>
                    </label>
                  )}
                <label>
                    Unidad de Medida:
                    <select 
                      name="unidadMedida"
                      value={nuevoIngrediente.unidadMedida}
                      onChange={handleUnidadMedidaChange}
                      required
                    >
                      <option value="">Seleccione una unidad</option>
                      <option value="Gramos">Gramos</option>
                      <option value="Litros">Litros</option>
                      <option value="Unidad(es)">Unidad(es)</option>
                    </select>
                  </label>

                  {categoriaSeleccionada === 'Ingredientes' && (
                    <label>
                      Fecha de Caducidad:
                      <DatePicker 
                      selected={currentFechaCaducidad} 
                      onChange={date => setCurrentFechaCaducidad(date)} 
                      dateFormat="dd/MM/yyyy"
                    />
                    </label>
                  )}
                      <label>
                          Disponible:
                          <input 
                          type="number" 
                          name="disponible" 
                          value={nuevoIngrediente.disponible} 
                          onChange={handleChange} required />
                      </label>
                      {/* <label>
                          Límite:
                          <input 
                          type="number" 
                          name="limite" 
                          value={nuevoIngrediente.limite} 
                          onChange={handleChange} required />
                      </label> */}
                      <label>
                          Referencia:
                          <input 
                          type="number" 
                          name="referencia" 
                          value={nuevoIngrediente.referencia} 
                          onChange={handleChange} required />
                      </label>
                
                      <button 
                      type="submit"
                      >Guardar
                      </button>
                      <button 
                      onClick={cerrarFormulario}
                      >Cerrar
                      </button>
                  </form>
              </div>
          )}
          {isFormVisible && (
              <div className={`overlay ${isFormVisible ? 'visible' : ''}`}>
                <form 
                    className='formulario-modificar'
                    onSubmit={e => {
                    e.preventDefault();
                    modificarIngrediente(currentId, currentDisponible, currentLimite, currentFechaCaducidad);
                    setIsFormVisible(false); 
                    }}
                    onClick={(e) => e.stopPropagation()}
                    >
                      <label>
                      Disponible:
                        <input 
                          type="number" 
                          value={currentDisponible}
                          onChange={(e) => setCurrentDisponible(e.target.value)}
                        />
                      </label>
                      {/* <label>
                          Límite:
                          <input 
                            type="number" 
                            value={currentLimite}
                            onChange={(e) => setCurrentLimite(e.target.value)}
                          />
                      </label> */}
                      <label>
                        Fecha de Caducidad:
                        <DatePicker 
                          selected={currentFechaCaducidad} 
                          onChange={date => setCurrentFechaCaducidad(date)} 
                          dateFormat="dd/MM/yyyy"
                        />
                      </label>
                      <button type="submit">Guardar Cambios</button>
                      <button onClick={() => setIsFormVisible(false)}>Cancelar</button>
               </form>
            </div>
            )}
          <section className={`contenedorTabla ${isDesenfocado ? 'desenfocado' : ''}`}>
              <table className='tabla'>
                  <thead>
                      <tr>
                          <th>IDR</th>
                          <th>IDI</th>
                          <th>Categoria</th>
                          <th>Subcategoria</th>
                          <th>Producto</th>
                          <th>Unidad de Medida</th>
                          <th>FechaCaducidad</th>
                          <th>Disponible</th>
                          {/* <th>Limite</th> */}
                          <th>Acciones</th>
                          <th>Referencia</th>
                          <th>UltimaModificacion</th>
                      </tr>
                  </thead>
                  <tbody>
                    {inventarioFinal.map((ing) => {
                        return (
                            <tr key={ing.IDR} >
                                <td>{ing.IDR}</td>
                                <td>{ing.IDI}</td>
                                <td>{ing.categoria}</td>
                                <td>{ing.subcategoria}</td>
                                <td>{ing.producto}</td>
                                <td>{ing.unidadMedida}</td>
                                <td>{ing.categoria === 'Ingredientes' ? formatearFecha(ing.fechaCaducidad) : 'No aplica'}</td>
                                <td>{ing.disponible}</td>
                                {/* <td>{formatearLimite(ing.categoria, ing.limite)}</td> */}
                                <td>
                                    <button onClick={() => showForm(ing.IDR, ing.disponible, ing.fechaCaducidad)}>Modificar</button>
                                    <button onClick={() => eliminarIngrediente(ing.IDR)}>Eliminar</button>
                                </td>
                                <td>{ing.referencia}</td>
                                <td>{formatearUltimaModificacion(ing.ultimaModificacion)}</td>
                            </tr>
                        );
                    })}
                </tbody>
              </table>
          </section>
      </div>
  </div>
);
};
export default ActualizaStock;
