#!/usr/bin/env python3
"""
Backend API Tests for MK8DX Competitive Hub Discord Authentication
Tests the verification endpoints and core API functionality.
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration from .env
BASE_URL = "https://racehub-auth.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        result = {
            'test': test_name,
            'success': success,
            'message': message,
            'timestamp': datetime.now().isoformat(),
            'details': details or {}
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_api_root(self):
        """Test GET /api - API root endpoint"""
        try:
            response = self.session.get(f"{API_BASE}/")
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['message', 'version', 'endpoints']
                
                if all(field in data for field in expected_fields):
                    self.log_test(
                        "API Root Info", 
                        True, 
                        f"API info returned successfully: {data['message']} v{data['version']}"
                    )
                else:
                    self.log_test(
                        "API Root Info", 
                        False, 
                        "Missing expected fields in API response",
                        {'response': data, 'expected': expected_fields}
                    )
            else:
                self.log_test(
                    "API Root Info", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("API Root Info", False, f"Request failed: {str(e)}")
    
    def test_verification_status_no_cookie(self):
        """Test GET /api/verification/status without cookie - should return not_logged_in"""
        try:
            # Clear any existing cookies
            self.session.cookies.clear()
            
            response = self.session.get(f"{API_BASE}/verification/status")
            
            if response.status_code == 200:
                data = response.json()
                expected_response = {'verified': False, 'status': 'not_logged_in'}
                
                if data == expected_response:
                    self.log_test(
                        "Verification Status (No Cookie)", 
                        True, 
                        "Correctly returned not_logged_in status"
                    )
                else:
                    self.log_test(
                        "Verification Status (No Cookie)", 
                        False, 
                        "Unexpected response format",
                        {'expected': expected_response, 'actual': data}
                    )
            else:
                self.log_test(
                    "Verification Status (No Cookie)", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("Verification Status (No Cookie)", False, f"Request failed: {str(e)}")
    
    def test_verification_create(self):
        """Test POST /api/verification/create with mock Discord data"""
        try:
            # Mock Discord user data
            mock_data = {
                "discordId": "TEST123456789",
                "username": "TestPlayer",
                "serverNickname": "TestPlayer_Lounge",
                "avatar": "test_avatar_hash",
                "isInServer": True
            }
            
            response = self.session.post(
                f"{API_BASE}/verification/create",
                json=mock_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    # Check if verification was created or auto-approved
                    status = data.get('status')
                    if status in ['approved', 'waiting_activity', 'waiting_lounge_name']:
                        self.log_test(
                            "Verification Create", 
                            True, 
                            f"Verification created with status: {status}",
                            {'response': data}
                        )
                        # Store test discordId for subsequent tests
                        self.test_discord_id = mock_data['discordId']
                    else:
                        self.log_test(
                            "Verification Create", 
                            False, 
                            f"Unexpected status: {status}",
                            {'response': data}
                        )
                else:
                    self.log_test(
                        "Verification Create", 
                        False, 
                        f"API returned success=false: {data.get('message', 'No message')}",
                        {'response': data}
                    )
            else:
                self.log_test(
                    "Verification Create", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("Verification Create", False, f"Request failed: {str(e)}")
    
    def test_verification_status_with_discord_id(self):
        """Test GET /api/verification/status?discordId=TEST123 after creation"""
        try:
            # Use the test discord ID from previous test
            test_discord_id = getattr(self, 'test_discord_id', 'TEST123456789')
            
            response = self.session.get(f"{API_BASE}/verification/status?discordId={test_discord_id}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Should have verification data now
                if 'status' in data and data.get('verified') is not None:
                    status = data.get('status')
                    verified = data.get('verified')
                    
                    self.log_test(
                        "Verification Status (With Discord ID)", 
                        True, 
                        f"Status retrieved: verified={verified}, status={status}",
                        {'response': data}
                    )
                else:
                    self.log_test(
                        "Verification Status (With Discord ID)", 
                        False, 
                        "Missing expected fields in response",
                        {'response': data}
                    )
            else:
                self.log_test(
                    "Verification Status (With Discord ID)", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("Verification Status (With Discord ID)", False, f"Request failed: {str(e)}")
    
    def test_verification_recheck(self):
        """Test POST /api/verification/recheck"""
        try:
            test_discord_id = getattr(self, 'test_discord_id', 'TEST123456789')
            
            recheck_data = {
                "discordId": test_discord_id
            }
            
            response = self.session.post(
                f"{API_BASE}/verification/recheck",
                json=recheck_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                
                if data.get('success'):
                    status = data.get('status')
                    match_count = data.get('matchCount', 0)
                    
                    self.log_test(
                        "Verification Recheck", 
                        True, 
                        f"Recheck completed: status={status}, matches={match_count}",
                        {'response': data}
                    )
                else:
                    self.log_test(
                        "Verification Recheck", 
                        False, 
                        f"Recheck failed: {data.get('message', 'No message')}",
                        {'response': data}
                    )
            elif response.status_code == 404:
                # This is expected if the pending verification doesn't exist
                self.log_test(
                    "Verification Recheck", 
                    True, 
                    "Recheck returned 404 (expected for test data)",
                    {'status_code': response.status_code}
                )
            else:
                self.log_test(
                    "Verification Recheck", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("Verification Recheck", False, f"Request failed: {str(e)}")
    
    def test_stats_api(self):
        """Test GET /api/stats"""
        try:
            response = self.session.get(f"{API_BASE}/stats")
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['players', 'races']
                
                if all(field in data for field in expected_fields):
                    self.log_test(
                        "Stats API", 
                        True, 
                        f"Stats returned: {data['players']} players, {data['races']} races"
                    )
                else:
                    self.log_test(
                        "Stats API", 
                        False, 
                        "Missing expected fields in stats response",
                        {'response': data, 'expected': expected_fields}
                    )
            else:
                self.log_test(
                    "Stats API", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("Stats API", False, f"Request failed: {str(e)}")
    
    def test_leaderboard_api(self):
        """Test GET /api/leaderboard"""
        try:
            response = self.session.get(f"{API_BASE}/leaderboard")
            
            if response.status_code == 200:
                data = response.json()
                expected_fields = ['players', 'lastUpdate']
                
                if all(field in data for field in expected_fields):
                    players = data.get('players', [])
                    player_count = len(players)
                    cached = data.get('cached', False)
                    
                    self.log_test(
                        "Leaderboard API", 
                        True, 
                        f"Leaderboard returned {player_count} players (cached: {cached})"
                    )
                else:
                    self.log_test(
                        "Leaderboard API", 
                        False, 
                        "Missing expected fields in leaderboard response",
                        {'response': data, 'expected': expected_fields}
                    )
            else:
                self.log_test(
                    "Leaderboard API", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            self.log_test("Leaderboard API", False, f"Request failed: {str(e)}")
    
    def test_discord_oauth_endpoints(self):
        """Test Discord OAuth endpoints (without actual authentication)"""
        try:
            # Test Discord auth initiation endpoint
            response = self.session.get(f"{API_BASE}/auth/discord", allow_redirects=False)
            
            if response.status_code == 302:
                redirect_url = response.headers.get('Location', '')
                if 'discord.com/api/oauth2/authorize' in redirect_url:
                    self.log_test(
                        "Discord OAuth Initiation", 
                        True, 
                        "Correctly redirects to Discord OAuth"
                    )
                else:
                    self.log_test(
                        "Discord OAuth Initiation", 
                        False, 
                        f"Unexpected redirect URL: {redirect_url}"
                    )
            else:
                self.log_test(
                    "Discord OAuth Initiation", 
                    False, 
                    f"Expected redirect (302), got HTTP {response.status_code}"
                )
        except Exception as e:
            self.log_test("Discord OAuth Initiation", False, f"Request failed: {str(e)}")
        
        try:
            # Test Discord callback without code (should return error)
            response = self.session.get(f"{API_BASE}/auth/discord/callback")
            
            if response.status_code == 400:
                data = response.json()
                if 'error' in data and 'code' in data['error'].lower():
                    self.log_test(
                        "Discord OAuth Callback (No Code)", 
                        True, 
                        "Correctly returns error for missing code"
                    )
                else:
                    self.log_test(
                        "Discord OAuth Callback (No Code)", 
                        False, 
                        f"Unexpected error response: {data}"
                    )
            else:
                self.log_test(
                    "Discord OAuth Callback (No Code)", 
                    False, 
                    f"Expected 400 error, got HTTP {response.status_code}"
                )
        except Exception as e:
            self.log_test("Discord OAuth Callback (No Code)", False, f"Request failed: {str(e)}")
    
    def run_all_tests(self):
        """Run all backend tests"""
        print(f"🚀 Starting Backend API Tests for MK8DX Competitive Hub")
        print(f"📍 Base URL: {BASE_URL}")
        print(f"🔗 API Base: {API_BASE}")
        print("=" * 60)
        
        # Core API tests
        self.test_api_root()
        self.test_stats_api()
        self.test_leaderboard_api()
        
        # Verification flow tests
        self.test_verification_status_no_cookie()
        self.test_verification_create()
        self.test_verification_status_with_discord_id()
        self.test_verification_recheck()
        
        # Discord OAuth tests
        self.test_discord_oauth_endpoints()
        
        print("=" * 60)
        
        # Summary
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"📊 TEST SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   ✅ Passed: {passed_tests}")
        print(f"   ❌ Failed: {failed_tests}")
        print(f"   📈 Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print(f"\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   • {result['test']}: {result['message']}")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)