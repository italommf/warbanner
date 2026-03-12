# ANSI Color Constants for Terminal Logs
C_GREEN  = "\033[92m"
C_YELLOW = "\033[93m"
C_RED    = "\033[91m"
C_BLUE   = "\033[94m"
C_CYAN   = "\033[96m"
C_MAGENTA = "\033[95m"
C_WHITE  = "\033[97m"
C_BOLD   = "\033[1m"
C_END    = "\033[0m"

# Visual Separators
SEP_HEAVY = f"{C_CYAN}{'═' * 70}{C_END}"
SEP_LIGHT = f"{C_CYAN}{'─' * 70}{C_END}"
SEP_IMAGE = f"{C_YELLOW}{'─' * 40}{C_END}"
SEP_BLOCK = f"{C_WHITE}{'·' * 50}{C_END}"
