import { Component, input } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-group-chat',
  imports: [],
  templateUrl: './group-chat.component.html',
  styleUrl: './group-chat.component.css'
})
export class GroupChatComponent {
  groupId!: string;

  constructor(private route: ActivatedRoute) { }

  ngOnInit() {
    // Opción 1: lectura única
    this.groupId = this.route.snapshot.paramMap.get('groupId')!;
    // Opción 2: suscripción a cambios (útil si el mismo componente
    // se queda vivo y cambia solo el parámetro)
    // this.route.paramMap.subscribe(pm => {
    //   this.groupId = pm.get('groupId')!;
    // });
    console.log('ID del grupo:', this.groupId);
    // Aquí arrancas tu lógica de chat con this.groupId
  }
}

