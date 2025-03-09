package cli

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
	"github.com/spf13/viper"
)

// rootCmd represents the base command
var rootCmd = &cobra.Command{
	Use:   "toolmin",
	Short: "ToolMin is a lightweight web-based admin toolkit",
	Long: `ToolMin provides a web interface for running TCL scripts and managing tools.
It includes user management, script storage, and variable management capabilities.`,
}

func init() {
	rootCmd.PersistentFlags().Bool("debug", false, "enable debug logging")
	viper.BindPFlag("debug", rootCmd.PersistentFlags().Lookup("debug"))
}

// Execute adds all child commands to the root command and sets flags appropriately.
func Execute() {
	// initConfig lives in config.go
	cobra.OnInitialize(initConfig)

	if err := rootCmd.Execute(); err != nil {
		fmt.Println(err)
		os.Exit(1)
	}
}

// func initConfig() {
// 	// Configuration initialization logic
// }
