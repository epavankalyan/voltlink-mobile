# ==============================================================================
# VoltLink Mobile - Makefile
# ==============================================================================
# Usage: make <target>
# Run `make help` for a list of all available targets.
# ==============================================================================

.PHONY: help install start android ios web clean \
        build-apk build-apk-preview build-apk-production \
        build-aab build-aab-production \
        eas-login eas-configure

# Default target
.DEFAULT_GOAL := help

APP_NAME := voltlink-mobile
ANDROID_PACKAGE := com.voltlink.mobile

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

help: ## Show this help message
	@echo ""
	@echo "  VoltLink Mobile — Available targets"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} /^[a-zA-Z_-]+:.*##/ { printf "  \033[36m%-28s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)
	@echo ""

# ------------------------------------------------------------------------------
# Setup & Dependencies
# ------------------------------------------------------------------------------

install: ## Install npm dependencies
	npm install

# ------------------------------------------------------------------------------
# Development
# ------------------------------------------------------------------------------

start: ## Start the Expo dev server
	npx expo start

android: ## Start the app on an Android device/emulator
	npx expo start --android

ios: ## Start the app on an iOS simulator
	npx expo start --ios

web: ## Start the app in the browser
	npx expo start --web

# ------------------------------------------------------------------------------
# APK Build (via EAS Build — Expo Application Services)
#
# Prerequisites:
#   1. Install EAS CLI:       npm install -g eas-cli
#   2. Log in:                make eas-login
#   3. Configure project:     make eas-configure
#   4. Ensure eas.json exists (created by make eas-configure)
# ------------------------------------------------------------------------------

eas-login: ## Log in to your Expo / EAS account
	npx eas-cli login

eas-configure: ## Configure EAS Build for this project (creates eas.json)
	npx eas-cli build:configure

## -- APK (Android Package) targets --

build-apk: ## Build a debug APK locally (no EAS account required)
	@echo "→ Building debug APK via local Expo/Gradle build…"
	npx expo run:android --variant debug
	@echo ""
	@echo "✓ APK output: android/app/build/outputs/apk/debug/app-debug.apk"

build-apk-preview: ## Build a preview APK via EAS (distributable, signed)
	@echo "→ Submitting preview APK build to EAS…"
	npx eas-cli build --platform android --profile preview
	@echo ""
	@echo "✓ Download the APK from the EAS dashboard once the build completes."

build-apk-production: ## Build a production APK via EAS (store-ready, signed)
	@echo "→ Submitting production APK build to EAS…"
	npx eas-cli build --platform android --profile production
	@echo ""
	@echo "✓ Download the APK from the EAS dashboard once the build completes."

## -- AAB (Android App Bundle) targets —for Play Store submission--

build-aab: ## Build a preview AAB via EAS
	@echo "→ Submitting preview AAB build to EAS…"
	npx eas-cli build --platform android --profile preview --output-format aab

build-aab-production: ## Build a production AAB via EAS (Play Store)
	@echo "→ Submitting production AAB build to EAS…"
	npx eas-cli build --platform android --profile production --output-format aab

# ------------------------------------------------------------------------------
# Utilities
# ------------------------------------------------------------------------------

clean: ## Remove node_modules, .expo cache, and Android build artifacts
	@echo "→ Cleaning up…"
	rm -rf node_modules .expo
	@if [ -d android ]; then \
		cd android && ./gradlew clean; \
	fi
	@echo "✓ Done."
