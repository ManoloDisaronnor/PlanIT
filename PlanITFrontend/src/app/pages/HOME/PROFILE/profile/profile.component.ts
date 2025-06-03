import { Component } from '@angular/core';
import { CommingsoonComponent } from "../../../../components/commingsoon/commingsoon.component";

/**
 * Componente de perfil de usuario
 * Actualmente muestra un mensaje de "próximamente" 
 * Funcionalidad en desarrollo para gestión completa de perfiles
 * 
 * @class ProfileComponent
 * @since 1.0.0
 * @author Manuel Santos Márquez
 */
@Component({
  selector: 'app-profile',
  imports: [CommingsoonComponent],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent {

}
