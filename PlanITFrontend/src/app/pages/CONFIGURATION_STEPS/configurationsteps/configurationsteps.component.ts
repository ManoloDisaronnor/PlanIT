import { Component, ViewChild } from '@angular/core';
import { AnimationOptions, LottieComponent } from 'ngx-lottie';
import { User } from 'firebase/auth';
import { getCurrentUser, setSessionStorage } from '../../../../../config/authUser';
import { CommonModule } from '@angular/common';
import { StepsverificationComponent } from '../stepsverification/stepsverification.component';
import { StepspersonalinformationComponent } from '../stepspersonalinformation/stepspersonalinformation.component';
import { StepsprofileComponent } from '../stepsprofile/stepsprofile.component';
import { StepsallsetComponent } from '../stepsallset/stepsallset.component';
import { InfodialogComponent } from '../../../components/infodialog/infodialog.component';
import { CamaraComponent } from '../../../components/camara/camara.component';
import { apiUrl } from '../../../../../config/config';
import { Router } from '@angular/router';

@Component({
  selector: 'app-configurationsteps',
  imports: [CommonModule, LottieComponent, StepsverificationComponent, StepspersonalinformationComponent, StepsprofileComponent, StepsallsetComponent, InfodialogComponent, CamaraComponent],
  templateUrl: './configurationsteps.component.html',
  styleUrl: './configurationsteps.component.css'
})
export class ConfigurationstepsComponent {
  currentStep = 1;
  emailVerified: boolean = false;
  lottieVisible: boolean = true;
  userConfigurationSteps = {
    uid: '',
    imageUrl: '',
    name: '',
    surname: '',
    username: '',
    birthdate: '',
    aboutme: '',
    address: '',
    gender: '',
  }
  steps = [
    { number: 1, disabled: this.currentStep !== 1, jsonPath: 'json/mail.json' },
    { number: 2, disabled: !this.emailVerified || this.currentStep !== 2, jsonPath: 'json/user_profile.json' },
    { number: 3, disabled: !this.emailVerified || this.userConfigurationSteps.name === '' || this.currentStep !== 3, jsonPath: 'json/Register.json' },
    { number: 4, disabled: !this.emailVerified || this.userConfigurationSteps.username === '' || this.currentStep !== 4, jsonPath: 'json/Success.json' },
  ];

  lottieOptionsArray: { [key: number]: AnimationOptions } = {};

  @ViewChild(StepsprofileComponent) stepsProfile!: StepsprofileComponent;

  userSignUp: User | null = null;
  showCamera: boolean = false;
  generalError: string | null = null;

  constructor(private router: Router) { }

  async ngOnInit() {
    const user = await getCurrentUser();
    if (user) {
      this.userSignUp = user;
      this.emailVerified = user.emailVerified;
      this.userConfigurationSteps.uid = user.uid;
      console.log(this.userConfigurationSteps.uid);
    }
    this.steps.forEach(step => {
      this.lottieOptionsArray[step.number] = {
        path: step.jsonPath,
        autoplay: !step.disabled,
        loop: true
      };
    });
  }

  changeStep(stepNumber: number) {
    if (stepNumber === 4) {
      this.refreshLottie(stepNumber);
      this.currentStep = stepNumber;
      this.currentStep = stepNumber;
      setSessionStorage(this.userConfigurationSteps.uid);
      setTimeout(() => {
        this.router.navigate(['/home']);
      }, 5000);
      return;
    }
    if (this.currentStep !== stepNumber) {
      this.refreshLottie(stepNumber);
      this.currentStep = stepNumber;
    }
  }

  refreshLottie(stepNumber: number) {
    this.lottieVisible = false;
    this.lottieOptionsArray[stepNumber] = {
      path: this.steps.find(s => s.number === stepNumber)?.jsonPath || '',
      autoplay: true,
      loop: true
    };
    this.lottieOptionsArray[this.currentStep] = {
      path: this.steps.find(s => s.number === this.currentStep)?.jsonPath || '',
      autoplay: false,
      loop: true
    };
    setTimeout(() => {
      this.lottieVisible = true;
    }, 0);
  }

  verificationCompleted(event: boolean) {
    this.emailVerified = event;
    this.changeStep(2);
  }

  recievedUserInformation(event: any) {
    this.userConfigurationSteps.name = event.name;
    this.userConfigurationSteps.surname = event.surname;
    this.userConfigurationSteps.birthdate = event.birthdate;
    this.userConfigurationSteps.gender = event.gender;
    this.userConfigurationSteps.address = event.address;
    this.changeStep(3);
  }

  showInformation(error: string) {
    this.generalError = error;
    setTimeout(() => {
      this.generalError = null;
    }
      , 5000);
  }

  async recievedUserProfile(event: any) {
    this.userConfigurationSteps.username = event.username;
    this.userConfigurationSteps.aboutme = event.aboutme;
    this.userConfigurationSteps.imageUrl = event.imageUrl;
    await this.handleUploadUserConfigurationSteps();
  }

  toggleCamera() {
    this.showCamera = !this.showCamera;
  }

  handleImageCaptured(imageDataUrl: string) {
    this.stepsProfile.handleWebcamImage(imageDataUrl);
    this.showCamera = false;
  }

  async handleUploadUserConfigurationSteps() {
    try {
      const response = await fetch(`${apiUrl}api/usuarios/setupconfiguration`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(this.userConfigurationSteps),
      });
      const data = await response.json();
      if (response.ok) {
        this.changeStep(4);
      } else {
        this.showInformation(data.mensaje);
      }
    } catch (error: any) {
      this.showInformation(error.message);
    }
  }
}