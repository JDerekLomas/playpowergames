interface Scorm12API {
  LMSInitialize: (message: string) => string;
  LMSSetValue: (element: string, value: string) => string;
  LMSGetValue: (element: string) => string;
  LMSCommit: (message?: string) => string;
  LMSFinish: () => string;
}

interface WindowWithAPI extends Window {
  API?: Scorm12API;
}

class ScormService {
  private static instance: ScormService;
  private api: Scorm12API;
  private initialized: boolean = false;
  private findAPITries: number = 0;
  private startTime = new Date();

  private constructor() {
    const api = this.getAPI();
    if (!api) {
      this.initialized = false;
    }
    this.api = api!;
  }

  public static getInstance(): ScormService {
    if (!ScormService.instance) {
      ScormService.instance = new ScormService();
    }
    return ScormService.instance;
  }

  initialize(): boolean {
    if (!this.initialized && this.api) {
      const result = this.api.LMSInitialize('');
      this.initialized = result === 'true';
      if (this.initialized) {
        this.api.LMSSetValue('cmi.core.lesson_status', 'incomplete');
        this.api.LMSCommit();
      }
    }
    return this.initialized;
  }

  findAPI(win: WindowWithAPI): Scorm12API | undefined | null {
    // Check to see if the window (win) contains the API
    // if the window (win) does not contain the API and
    // the window (win) has a parent window and the parent window
    // is not the same as the window (win)
    while ((win as unknown as { API: object }).API == null && win.parent != null && win.parent != win) {
      // increment the number of findAPITries
      this.findAPITries++;

      // Note: 7 is an arbitrary number, but should be more than sufficient
      if (this.findAPITries > 7) {
        alert('Error finding API -- too deeply nested.');
        return null;
      }

      // set the variable that represents the window being
      // being searched to be the parent of the current window
      // then search for the API again
      win = win.parent;
    }
    return win.API;
  }

  getAPI(): Scorm12API | null | undefined {
    // start by looking for the API in the current window
    let theAPI = this.findAPI(window);

    // if the API is null (could not be found in the current window)
    // and the current window has an opener window
    if (theAPI == null && window.opener != null && typeof window.opener != 'undefined') {
      // try to find the API in the current window's opener
      theAPI = this.findAPI(window.opener);
    }
    // if the API has not been found
    if (theAPI == null) {
      // Alert the user that the API Adapter could not be found
      console.error('Unable to find an API adapter');
    }
    return theAPI;
  }

  setValue(element: string, value: string): boolean {
    if (!this.initialized) return false;
    const result = this.api.LMSSetValue(element, value);
    return result === 'true';
  }

  getValue(element: string): string {
    if (!this.initialized) return '';
    return this.api.LMSGetValue(element);
  }

  setScore(score: number, minScore?: number, maxScore?: number): boolean {
    if (!this.initialized) return false;

    this.setValue('cmi.core.score.raw', score.toString());
    if (minScore !== undefined && minScore !== null) {
      this.setValue('cmi.core.score.min', minScore.toString());
    }
    if (maxScore !== undefined && maxScore !== null) {
      this.setValue('cmi.core.score.max', maxScore.toString());
    }

    return true;
  }

  setStatus(status: 'completed' | 'incomplete' | 'failed' | 'passed'): boolean {
    if (!this.initialized) return false;
    return this.setValue('cmi.core.lesson_status', status);
  }

  setLocation(location: string): boolean {
    if (!this.initialized) return false;
    return this.setValue('cmi.core.lesson_location', location);
  }

  startSessionTime(): void {
    this.startTime = new Date();
  }

  endSessionTime(): void {
    const endTime = new Date();
    const sessionTime = endTime.getTime() - this.startTime.getTime();
    this.setValue('cmi.core.session_time', this.convertMilliSecondsToSCORMTime(sessionTime, false));
  }

  //SCORM requires time to be formatted in a specific way
  private convertMilliSecondsToSCORMTime(intTotalMilliseconds: number, blnIncludeFraction: boolean = true): string {
    let intHours;
    let intMinutes;
    let intSeconds;
    let intMilliseconds;
    let strCMITimeSpan;

    if (blnIncludeFraction == null || blnIncludeFraction == undefined) {
      blnIncludeFraction = true;
    }

    //extract time parts
    intMilliseconds = intTotalMilliseconds % 1000;

    intSeconds = ((intTotalMilliseconds - intMilliseconds) / 1000) % 60;

    intMinutes = ((intTotalMilliseconds - intMilliseconds - intSeconds * 1000) / 60000) % 60;

    intHours = (intTotalMilliseconds - intMilliseconds - intSeconds * 1000 - intMinutes * 60000) / 3600000;

    /*
	    deal with exceptional case when content used a huge amount of time and interpreted CMITimstamp 
	    to allow a number of intMinutes and seconds greater than 60 i.e. 9999:99:99.99 instead of 9999:60:60:99
	    note - this case is permissable under SCORM, but will be exceptionally rare
	    */

    if (intHours == 10000) {
      intHours = 9999;

      intMinutes = (intTotalMilliseconds - intHours * 3600000) / 60000;
      if (intMinutes == 100) {
        intMinutes = 99;
      }
      intMinutes = Math.floor(intMinutes);

      intSeconds = (intTotalMilliseconds - intHours * 3600000 - intMinutes * 60000) / 1000;
      if (intSeconds == 100) {
        intSeconds = 99;
      }
      intSeconds = Math.floor(intSeconds);

      intMilliseconds = intTotalMilliseconds - intHours * 3600000 - intMinutes * 60000 - intSeconds * 1000;
    }

    //drop the extra precision from the milliseconds
    const intHundredths = Math.floor(intMilliseconds / 10);

    //put in padding 0's and concatinate to get the proper format
    strCMITimeSpan =
      this.zeroPad(intHours, 4) + ':' + this.zeroPad(intMinutes, 2) + ':' + this.zeroPad(intSeconds, 2);

    if (blnIncludeFraction) {
      strCMITimeSpan += '.' + intHundredths;
    }

    //check for case where total milliseconds is greater than max supported by strCMITimeSpan
    if (intHours > 9999) {
      strCMITimeSpan = '9999:99:99';

      if (blnIncludeFraction) {
        strCMITimeSpan += '.99';
      }
    }

    return strCMITimeSpan;
  }

  private zeroPad(intNum: number, intNumDigits: number): string {
    let strTemp = intNum.toString();
    const intLen = strTemp.length;

    if (intLen > intNumDigits) {
      strTemp = strTemp.substring(0, intNumDigits);
    } else {
      for (let i = intLen; i < intNumDigits; i++) {
        strTemp = '0' + strTemp;
      }
    }

    return strTemp;
  }

  commit(message: string = ''): boolean {
    if (!this.initialized) return false;
    const result = this.api.LMSCommit(message);
    return result === 'true';
  }

  terminate(): boolean {
    if (!this.initialized) return false;
    const result = this.api.LMSFinish();
    this.initialized = false;
    return result === 'true';
  }
}

export const scormService = ScormService.getInstance();
