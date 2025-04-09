module.exports = {
    exito: (datos, mensaje = 'Operación realizada correctamente') => ({
        ok: true,
        datos: datos,
        mensaje: mensaje,
    }),

    // He incorporado un tercer parámetro (codError) para poder indentificar el error en el frontend
    error: (datos, mensaje = "Error en la consulta", codError) => ({
        ok: false,
        datos: null,
        mensaje: mensaje,
        codError: codError,
    })
}