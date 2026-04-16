"""CLI runner for local dev. Usage:
  python run.py sales <lead_id> <lead_email>
  python run.py support <ticket_id> "<ticket_body>"
  python run.py marketing "<brief>" "<persona>" kw1,kw2
"""
import sys

from sales_crew import SalesCrew
from support_crew import SupportCrew
from marketing_crew import MarketingCrew


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]
    if cmd == "sales":
        print(SalesCrew().run(sys.argv[2], sys.argv[3]))
    elif cmd == "support":
        print(SupportCrew().run(sys.argv[2], sys.argv[3]))
    elif cmd == "marketing":
        kw = sys.argv[4].split(",") if len(sys.argv) > 4 else []
        print(MarketingCrew().run(sys.argv[2], sys.argv[3], kw))
    else:
        print(__doc__)
        sys.exit(1)


if __name__ == "__main__":
    main()
