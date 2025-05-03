import { Component } from '@angular/core';
import { getCurrentUser, setSessionStorage } from '../../../../../../config/authUser';
import { InfodialogComponent } from '../../../../components/infodialog/infodialog.component';
import { CommonModule } from '@angular/common';
import { apiUrl } from '../../../../../../config/config';
import { GroupsCreateComponent } from "../groups-create/groups-create.component";

@Component({
  selector: 'app-groups',
  imports: [CommonModule, InfodialogComponent, GroupsCreateComponent],
  templateUrl: './groups.component.html',
  styleUrl: './groups.component.css'
})
export class GroupsComponent {
  groupList: any[] = [];
  generalError: string | null = null;
  typeError: string = 'error';
  showModal: boolean = false;

  async ngOnInit() {
    const user = sessionStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      await this.getGroupList(userData.uid);
    } else {
      const firebaseUser = await getCurrentUser();
      if (firebaseUser) {
        await setSessionStorage(firebaseUser.uid);
        const user = sessionStorage.getItem('user');
        if (user) {
          const userData = JSON.parse(user);
          await this.getGroupList(userData.uid);
        }
      }
    }
  }

  async getGroupList(uid: string) {
    try {
      const response = await fetch(`${apiUrl}api/grupos/getgroups/${uid}`, {
        method: 'GET',
        credentials: 'include',
      });
      const data = await response.json();
      if (response.ok) {
        this.groupList = data.datos;
      } else {
        if (data.codError === "NO_GROUPS_FOUND") {
          this.showInformation("No tienes grupos creados", "info");
        } else {
          this.showInformation(data.mensaje, "error");
        }
      }
    } catch (error: any) {
      this.showInformation(error.message, "error");
    }
  }

  showInformation(error: string, type: string) {
    this.typeError = type;
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }
      , 5000);
  }

  toggleModal() {
    this.showModal = !this.showModal;
  }
}
