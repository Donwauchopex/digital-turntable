import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { WebStorageStateStore } from "oidc-client-ts";
import {
  AuthProvider,
  useAuth,
  type AuthProviderProps,
} from "react-oidc-context";
import { WebPlaybackSDK } from "react-spotify-web-playback-sdk";

const getRedirectUri = () => {
  if (typeof window !== "undefined") {
    const baseUrl = window.location.origin;
    return `${baseUrl}/callback`;
  }
  return "http://127.0.0.1:3000/callback";
};

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  const router = useRouter();

  const oidcConfig: AuthProviderProps = {
    authority: "https://accounts.spotify.com",
    metadata: {
      issuer: "https://accounts.spotify.com",
      authorization_endpoint: "https://accounts.spotify.com/authorize",
      token_endpoint: "https://accounts.spotify.com/api/token",
      userinfo_endpoint: "https://api.spotify.com/v1/me",
    },
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    redirect_uri: getRedirectUri(),
    scope:
      "user-read-private user-read-email streaming user-read-playback-state user-modify-playback-state",
    response_type: "code",
    loadUserInfo: true,
    userStore: new WebStorageStateStore({ store: window.localStorage }),
    onSigninCallback: async () => {
      await router.navigate({ to: "/" });
    },
  };

  return (
    <AuthProvider {...oidcConfig}>
      <AuthenticatedContent />
      <TanStackRouterDevtools />
    </AuthProvider>
  );
}

function AuthenticatedContent() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 bg-green-400 rounded-full animate-pulse mx-auto mb-4"></div>
          <p className="text-gray-400 font-mono text-sm">
            Loading Authentication...
          </p>
        </div>
      </div>
    );
  }

  return (
    <WebPlaybackSDK
      initialDeviceName="Digital Turntable"
      getOAuthToken={(cb) => {
        if (user?.access_token) {
          cb(user.access_token);
        }
      }}
      initialVolume={0.5}
      connectOnInitialized={true}
    >
      <Outlet />
    </WebPlaybackSDK>
  );
}
