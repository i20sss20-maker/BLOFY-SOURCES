import unittest
from importlib.util import spec_from_file_location,module_from_spec
from pathlib import Path
spec=spec_from_file_location("summarizer",Path(__file__).with_name("summarize-relay-health.py"))
m=module_from_spec(spec)
spec.loader.exec_module(m)
class HealthSummaryTest(unittest.TestCase):
    def test_missing_is_not_zero(self):
        s=m.summarize([{"activeFeeds":2,"channels":[]}])
        self.assertIsNone(s["sourceEofEvents"])
        self.assertEqual(s["classification"],["insufficient_evidence_to_attribute"])
    def test_distinguish_source_and_local(self):
        s=m.summarize([{"activeFeeds":2,"failureDelta":{"fanout_upstream_ended":2},
            "delta":{"ingressQueueFullCount":1,"sourceLimitRejections":0},
            "channels":[{"channel":1,"viewers":1,"lastSourceReadAgeMs":2500,"lastMediaAgeMs":2600},
                        {"channel":2,"viewers":1,"lastSourceReadAgeMs":100,"lastMediaAgeMs":2300}]}])
        self.assertEqual(s["sourceEofEvents"],2)
        self.assertEqual(s["channelsWithSourceStalls"],[1])
        self.assertEqual(s["channelsWithDeliveryLag"],[2])
        self.assertEqual(s["classification"],["upstream_read_interruption_observed","local_delivery_pressure_observed"])
        self.assertFalse(s["providerCauseProven"])
        self.assertFalse(s["decodedPlaybackVerified"])
    def test_admission(self):
        s=m.summarize([{"delta":{"sourceLimitRejections":3,"capacityRejections":0}}])
        self.assertEqual(s["classification"],["admission_rejection_observed"])
        self.assertEqual(s["sourceLimitRejections"],3)
    def test_no_viewers_no_stall(self):
        s=m.summarize([{"channels":[{"channel":1,"viewers":0,"lastSourceReadAgeMs":5000}]}])
        self.assertEqual(s["channelsWithSourceStalls"],[])
if __name__=="__main__":
    unittest.main()
