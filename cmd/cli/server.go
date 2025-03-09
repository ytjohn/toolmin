package cli

import (
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
	"github.com/ytjohn/toolmin/pkg/server"
)

func init() {
	rootCmd.AddCommand(serverCmd)
	serverCmd.Flags().String("webdir", "", "Path to web content directory (uses embedded if not set)")
	viper.BindPFlag("server.webdir", serverCmd.Flags().Lookup("webdir"))
}

var serverCmd = &cobra.Command{
	Use:   "serve",
	Short: "Start the web server",
	Run: func(cmd *cobra.Command, args []string) {
		config := &server.Config{
			Host:          GlobalConfig.Server.Host,
			Port:          GlobalConfig.Server.Port,
			Debug:         GlobalConfig.Debug,
			WebContentDir: viper.GetString("server.webdir"),
		}

		srv := server.New(config, Log)
		Log.Info("starting server", "host", config.Host, "port", config.Port)
		if err := srv.Start(); err != nil {
			Log.Error("server error", "error", err)
			os.Exit(1)
		}
	},
}
