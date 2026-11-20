import 'package:permission_handler/permission_handler.dart';

class PermissionService {
  static Future<bool> requestCameraAndPhotos() async {
    final statuses = await [
      Permission.camera,
      Permission.photos,
    ].request();
    return statuses.values.every((s) => s.isGranted || s.isLimited);
  }

  static Future<bool> requestVideoCapture() async {
    final statuses = await [
      Permission.camera,
      Permission.microphone,
      Permission.videos,
    ].request();
    return statuses[Permission.camera]?.isGranted == true &&
        statuses[Permission.microphone]?.isGranted == true;
  }

  static Future<bool> requestMicrophone() async {
    final status = await Permission.microphone.request();
    return status.isGranted;
  }

  static Future<bool> requestNotifications() async {
    final status = await Permission.notification.request();
    return status.isGranted;
  }
}
