{pkgs}: {
  # Which nixpkgs channel to use.
  channel = "stable-24.11"; # or "unstable"

  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.android-tools
    pkgs.nodejs_20
    pkgs.zulu
    pkgs.busybox  # ✅ added this line to get fuser and netstat
  ];

  # Sets environment variables in the workspace
  env = {};

  # This adds a file watcher to startup the firebase emulators
  services.firebase.emulators = {
    detect = true;
    projectId = "demo-app";
    services = ["auth" "firestore"];
  };

  idx = {
    extensions = [
      # "vscodevim.vim"
    ];
    workspace = {
      onCreate = {
        default.openFiles = [
          "src/app/page.tsx"
        ];
      };
    };

    previews = {
      enable = true;
      previews = {
        web = {
          command = ["npm" "run" "dev" "--" "--port" "$PORT" "--hostname" "0.0.0.0"];
          manager = "web";
        };
      };
    };
  };
}
