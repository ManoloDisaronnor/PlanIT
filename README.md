# PlanIT

![Version](https://img.shields.io/badge/version-beta1.0.0-purple)

---

## Descripción del Proyecto

PlanIT es una página web pensada para facilitar la organización de eventos entre grupos de amigos. La idea es que los usuarios puedan planificar actividades y eventos de forma colaborativa, aprovechando funcionalidades modernas como grupos de chat y la integración con Google Maps para ubicar eventos y descubrir actividades públicas cercanas. ¡Una forma práctica y divertida de no dejar que se te escape nada!

---

## Funcionalidades Principales

- **Grupos de Chat:**  
  Permite la creación de grupos de chat para enviar mensajes entre amigos, similar a otras aplicaciones de mensajería.  
  Comentarios de la version 0.5:
  - Sistema de chat en tiempo real implementado
  - Funcionalidad para enviar archivos imagenes y audio coming soon
  <!-- Comentario: Integración de chat para comunicación instantánea -->

- **Gestión de Eventos con Integración a Google Maps:**  
  Los usuarios pueden crear y gestionar eventos, indicando la ubicación exacta mediante Google Maps. Se pueden configurar eventos como públicos o privados, permitiendo descubrir eventos cercanos según la preferencia de cada usuario.  
  Comentarios de la version alpha 1.0_
  - Sistema de insignias para el usuario incorporado, crea y unete a eventos para obtener estas insignias
  - Creación de eventos públicos, o, indicando grupos concretos para un evento cerrado.
  - Pestaña discover para enventos públicos con filtrados mediante filtros y ordenamiento segun la ubicacion.
  - Pestaña Personal para eventos en curso, futuros, o pasados.
  - Pestaña Tus eventos para ver los eventos que has ido creando.
  <!-- Comentario: Utilización de Google Maps para mejorar la experiencia de localización -->

  ## Notas de la Versión Beta 1.0.0

  Esta versión marca la transición de alpha a beta, incorporando algunos arreglos esenciales:

  ### Nuevas Características
  - **Componente de informacion de la web:** Para poder conocer un poco mas sobre planIT. Boton ubicado arriba a la derecha del header.
  - **Añadidos componentes comming soon:** Creados nuevos componentes para mostrar que no estaran disponible para el despliegue oficial.

  ### Mejoras
  - **Mejora modal para crear grupos:** Antes se mostraba con muy poco height la seleccion de usuarios para el grupo. Corregido y mejorada visibilidad en pantallas pequeñas. 
  - **Panel social:** Mejorada la visualizacion de amigos, añadida propiedad overflow al texto por si es muy largo mostrar tres puntos

  ### Correcciones de Errores
  - Solucionada solicitud paginada en los grupos al mostrar el mismo numero de grupos que el limit.
  - Modificado boton centrar en la ubicacion del evento. (Pendiente de testing)

  ### Próximamente en PlanIT
  - Correcion del chat y el input para escribir. Arreglar autogrow y estilo para el overflow en pantallas chicas

---

## Detalles Técnicos y Tecnologías

- **Frontend:**  
  - Angular 19

- **Backend:**  
  - Node.js con Express

- **Autenticación y Gestión de Usuarios:**  
  - Firebase se utiliza para almacenar correo, contraseña y uid.
  - Base de datos MySQL para almacenar otros datos, como la imagen de perfil.

- **Despliegue:**  
  - AWS será el entorno principal de despliegue.
  - Alternativamente, Railway utilizando Docker Hub.

---

## Instalación y Uso

Este repositorio se utiliza únicamente para documentar los cambios y evolución del proyecto, por lo que no es necesaria la instalación local. PlanIT ya estará desplegado y accesible en línea.

---

*¡Esperamos que disfrutes utilizando PlanIT y que te ayude a organizar esos eventos increíbles con tus amigos!*