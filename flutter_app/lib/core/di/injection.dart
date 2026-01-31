import 'package:get_it/get_it.dart';
import '../api/api_client.dart';

/// Dependency Injection Container
///
/// Central sted til at registrere og resolve dependencies.
/// Bruger get_it som service locator.
///
/// Benefits:
/// - Single source of truth for dependencies
/// - Easy testing (mock dependencies)
/// - Loose coupling mellem komponenter
/// - Nem at skifte implementations
///
/// Usage:
/// ```dart
/// // I main.dart:
/// await setupDependencyInjection();
///
/// // I kode:
/// final apiClient = getIt<ApiClient>();
/// ```
final getIt = GetIt.instance;

/// Setup alle dependencies
///
/// Registrerer dependencies i den rigtige rækkefølge:
/// 1. Core services (ApiClient)
/// 2. Data sources (når I tilføjer dem)
/// 3. Repositories (når I tilføjer dem)
/// 4. BLoCs (når I tilføjer dem)
///
/// Kaldes fra main.dart før app starter.
Future<void> setupDependencyInjection() async {
  // ============================================================
  // Core - API Client
  // ============================================================
  getIt.registerLazySingleton<ApiClient>(
    () => ApiClient(),
  );

  // TODO: Tilføj data sources, repositories og BLoCs her efterhånden:
  // getIt.registerLazySingleton<AuthRepository>(
  //   () => AuthRepositoryImpl(apiClient: getIt<ApiClient>()),
  // );
  // getIt.registerFactory<LoginBloc>(
  //   () => LoginBloc(authRepository: getIt<AuthRepository>()),
  // );
}

/// Reset dependency injection
///
/// Nyttigt til testing hvor du vil starte med clean slate.
Future<void> resetDependencyInjection() async {
  await getIt.reset();
}
