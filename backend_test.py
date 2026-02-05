#!/usr/bin/env python3
"""
Backend API Testing Suite for MK8DX Hub
Tests the Lounge player count API endpoint as requested.
"""

import requests
import json
import time
from datetime import datetime
import sys

# Configuration
BASE_URL = "https://lounge-players.preview.emergentagent.com"
API_BASE = f"{BASE_URL}/api"

def test_lounge_player_count():
    """Test the Lounge player count API endpoint"""
    print("=" * 60)
    print("TESTING: Lounge Player Count API")
    print("=" * 60)
    
    # Test 1: Basic GET request without refresh
    print("\n1. Testing GET /api/lounge/player-count (cached)")
    try:
        response = requests.get(f"{API_BASE}/lounge/player-count", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            required_fields = ['count', 'cached', 'lastUpdate']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ FAIL: Missing required fields: {missing_fields}")
                return False
            
            # Validate data types
            if not isinstance(data['count'], int) or data['count'] < 0:
                print(f"❌ FAIL: Invalid count value: {data['count']}")
                return False
            
            if not isinstance(data['cached'], bool):
                print(f"❌ FAIL: Invalid cached value: {data['cached']}")
                return False
            
            # Check if count is approximately correct (around 54869)
            expected_range = (50000, 60000)  # Allow some variance
            if not (expected_range[0] <= data['count'] <= expected_range[1]):
                print(f"⚠️  WARNING: Player count {data['count']} outside expected range {expected_range}")
            else:
                print(f"✅ Player count {data['count']} is within expected range")
            
            print(f"✅ PASS: Basic player count request successful")
            first_response = data
            
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Request failed with error: {str(e)}")
        return False
    
    # Test 2: Force refresh request
    print("\n2. Testing GET /api/lounge/player-count?refresh=true (force refresh)")
    try:
        response = requests.get(f"{API_BASE}/lounge/player-count?refresh=true", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # Validate response structure
            required_fields = ['count', 'cached', 'lastUpdate']
            missing_fields = [field for field in required_fields if field not in data]
            
            if missing_fields:
                print(f"❌ FAIL: Missing required fields: {missing_fields}")
                return False
            
            # For refresh=true, cached should be false
            if data['cached'] != False:
                print(f"❌ FAIL: Expected cached=false for refresh request, got {data['cached']}")
                return False
            
            # Count should be similar to first request
            if abs(data['count'] - first_response['count']) > 100:
                print(f"⚠️  WARNING: Large difference in count between requests: {first_response['count']} vs {data['count']}")
            
            print(f"✅ PASS: Force refresh request successful")
            
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Refresh request failed with error: {str(e)}")
        return False
    
    # Test 3: Test caching behavior
    print("\n3. Testing caching behavior (immediate second request)")
    try:
        response = requests.get(f"{API_BASE}/lounge/player-count", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Response: {json.dumps(data, indent=2)}")
            
            # This should be cached (unless cache expired)
            if data['cached']:
                print(f"✅ PASS: Response properly cached")
            else:
                print(f"⚠️  INFO: Response not cached (cache may have expired)")
            
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: Cache test failed with error: {str(e)}")
        return False
    
    # Test 4: Test error handling (simulate by testing with invalid parameters)
    print("\n4. Testing error handling")
    try:
        # Test with invalid parameter (should still work but ignore invalid param)
        response = requests.get(f"{API_BASE}/lounge/player-count?invalid=param", timeout=30)
        print(f"Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ PASS: API handles invalid parameters gracefully")
        else:
            print(f"⚠️  INFO: API returned {response.status_code} for invalid parameter")
            
    except Exception as e:
        print(f"❌ FAIL: Error handling test failed: {str(e)}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ ALL LOUNGE PLAYER COUNT TESTS PASSED")
    print("=" * 60)
    return True

def test_api_availability():
    """Test basic API availability"""
    print("=" * 60)
    print("TESTING: API Availability")
    print("=" * 60)
    
    try:
        response = requests.get(f"{API_BASE}/", timeout=10)
        print(f"API Root Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"API Info: {json.dumps(data, indent=2)}")
            print("✅ PASS: API is available")
            return True
        else:
            print(f"❌ FAIL: API returned {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ FAIL: API not available: {str(e)}")
        return False

def main():
    """Run all tests"""
    print("Starting Backend API Tests for Lounge Player Count")
    print(f"Base URL: {BASE_URL}")
    print(f"API Base: {API_BASE}")
    print(f"Test Time: {datetime.now().isoformat()}")
    
    # Test API availability first
    if not test_api_availability():
        print("\n❌ CRITICAL: API not available, stopping tests")
        sys.exit(1)
    
    # Test the specific endpoint requested
    success = test_lounge_player_count()
    
    if success:
        print(f"\n🎉 ALL TESTS PASSED!")
        print("The Lounge player count API endpoint is working correctly.")
        sys.exit(0)
    else:
        print(f"\n❌ SOME TESTS FAILED!")
        print("Please check the implementation and try again.")
        sys.exit(1)

if __name__ == "__main__":
    main()