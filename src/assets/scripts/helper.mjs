export class Helper {
  connection;

  constructor(connection) {
    this.connection = connection;
  }

  getSupportedMimeTypes = () => {
    const possibleTypes = [
      'video/webm;codecs=vp8,opus',
      'video/webm;codecs=h264,opus',
      'video/webm;codecs=vp9,opus',
      'video/mp4;codecs=h264,aac',
    ];
    const codecs = possibleTypes.filter(mimeType => {
      return MediaRecorder.isTypeSupported(mimeType);
    });

    if (codecs.length > 0) {
      return codecs[0];
    }

    return null;
  }

  downloadFile = (blob, filename) => {
    const anchor = document.createElement("a");
    anchor.style.display = "none";

    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    anchor.click();
  }

  getBrowserName = (userAgent) => {
    // The order matters here, and this may report false positives for unlisted browsers.

    if (userAgent.includes('Firefox')) {
      // "Mozilla/5.0 (X11; Linux i686; rv:104.0) Gecko/20100101 Firefox/104.0"
      return 'Mozilla Firefox';
    } else if (userAgent.includes('SamsungBrowser')) {
      // "Mozilla/5.0 (Linux; Android 9; SAMSUNG SM-G955F Build/PPR1.180610.011) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/9.4 Chrome/67.0.3396.87 Mobile Safari/537.36"
      return 'Samsung Internet';
    } else if (userAgent.includes('Opera') || userAgent.includes('OPR')) {
      // "Mozilla/5.0 (Macintosh; Intel Mac OS X 12_5_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 OPR/90.0.4480.54"
      return 'Opera';
    } else if (userAgent.includes('Trident')) {
      // "Mozilla/4.0 (compatible; MSIE 7.0; Windows NT 10.0; WOW64; Trident/7.0; .NET4.0C; .NET4.0E; .NET CLR 2.0.50727; .NET CLR 3.0.30729; .NET CLR 3.5.30729)"
      return 'Microsoft Internet Explorer';
    } else if (userAgent.includes('Edge')) {
      // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36 Edge/16.16299"
      return 'Microsoft Edge (Legacy)';
    } else if (userAgent.includes('Edg')) {
      // "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36 Edg/104.0.1293.70"
      return 'Microsoft Edge (Chromium)';
    } else if (userAgent.includes('Chrome')) {
      // "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/104.0.0.0 Safari/537.36"
      return 'Google Chrome or Chromium';
    } else if (userAgent.includes('Safari')) {
      // "Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6 Mobile/15E148 Safari/604.1"
      return 'Apple Safari';
    } else {
      return 'unknown';
    }
  }

  getWebRTCErrorMessage = (error) => {
    let message = 'Cannot obtain UserMedia device video. Another error occurred';

    if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
      message = 'Cannot obtain UserMedia device video. Required track is missing';
    } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
      message = 'Cannot obtain UserMedia device video. Webcam or mic are already in use';
    } else if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
      message = 'Cannot obtain UserMedia device video. Constraints can not be satisfied by available devices';
    } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
      message = 'Cannot obtain UserMedia device video. Permission Denied';
    } else if (error.name === "TypeError" || error.name === "TypeError") {
      message = 'Cannot obtain UserMedia device video. Both audio and video are FALSE';
    }

    return message + ': ' + JSON.stringify(error.name) + ' - ' + JSON.stringify(error.message);
  }

}
