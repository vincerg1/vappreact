import CreateMenuForm from '../pages/_Menu_p2_crearMenu'; 

function FormularioPizza({pizzaToEdit , isEditMode, handleSubmit}) { 

    return (
        <div>
            {/* <h2>{isEditMode ? "Editar Pizza" : "Crear Pizza"}</h2> */}
            <CreateMenuForm 
            initialValues={pizzaToEdit}
            isEditMode={isEditMode}
            handleSubmit={handleSubmit}
             />
        </div>
    );
}

export default FormularioPizza;
