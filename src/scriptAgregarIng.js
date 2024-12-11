// ../scriptAgregarIng.js

function abrirFormulario() {
    document.querySelector('.contenido-principal').classList.add('desenfocado');
    document.querySelector('.overlay').style.display = 'flex';
}

function cerrarFormulario() {
    document.querySelector('.contenido-principal').classList.remove('desenfocado');
    document.querySelector('.overlay').style.display = 'none';
}