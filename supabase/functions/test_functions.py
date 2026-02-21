"""
Test script for Python backend functions
Tests all three endpoints with sample data
"""
import json
import urllib.request
import urllib.error


BASE_URL = "http://localhost:8000"


def test_analyze_insights():
    """Test the analyze-insights endpoint"""
    print("\n" + "="*60)
    print("Testing: analyze-insights")
    print("="*60)
    
    url = f"{BASE_URL}/analyze-insights"
    data = {
        "insights": {
            "symptoms": ["headache", "fever"],
            "duration": "3 days",
            "severity": "moderate"
        }
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print("\n✓ Success!")
            print(f"Status: {response.status}")
            print(f"Response: {json.dumps(result, indent=2)}")
            return True
            
    except urllib.error.HTTPError as e:
        error_data = e.read().decode('utf-8')
        print(f"\n✗ Error: {e.code}")
        print(f"Details: {error_data}")
        return False
    except Exception as e:
        print(f"\n✗ Exception: {e}")
        return False


def test_nearby_hospitals():
    """Test the nearby-hospitals endpoint"""
    print("\n" + "="*60)
    print("Testing: nearby-hospitals")
    print("="*60)
    
    url = f"{BASE_URL}/nearby-hospitals"
    data = {
        "lat": 37.7749,
        "lon": -122.4194,
        "categoryFilter": "all"
    }
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print("\n✓ Success!")
            print(f"Status: {response.status}")
            print(f"Found {len(result.get('results', []))} hospitals")
            if result.get('results'):
                print(f"\nFirst result:")
                print(json.dumps(result['results'][0], indent=2))
            return True
            
    except urllib.error.HTTPError as e:
        error_data = e.read().decode('utf-8')
        print(f"\n✗ Error: {e.code}")
        print(f"Details: {error_data}")
        return False
    except Exception as e:
        print(f"\n✗ Exception: {e}")
        return False


def test_transcribe():
    """Test the transcribe endpoint"""
    print("\n" + "="*60)
    print("Testing: transcribe")
    print("="*60)
    
    # Note: This requires an actual audio file
    print("\n⚠ Skipping - requires audio file")
    print("To test manually:")
    print(f"  curl -X POST {BASE_URL}/transcribe -F 'file=@audio.webm'")
    return None


def test_cors():
    """Test CORS preflight"""
    print("\n" + "="*60)
    print("Testing: CORS preflight")
    print("="*60)
    
    url = f"{BASE_URL}/analyze-insights"
    
    try:
        req = urllib.request.Request(url, method='OPTIONS')
        
        with urllib.request.urlopen(req) as response:
            print("\n✓ CORS preflight successful!")
            print(f"Status: {response.status}")
            print(f"Headers:")
            for header, value in response.headers.items():
                if 'Access-Control' in header:
                    print(f"  {header}: {value}")
            return True
            
    except Exception as e:
        print(f"\n✗ Exception: {e}")
        return False


def main():
    """Run all tests"""
    print("\n" + "="*60)
    print("🐍 Python Backend Test Suite")
    print("="*60)
    print(f"\nBase URL: {BASE_URL}")
    print("\nMake sure the dev server is running:")
    print("  python dev_server.py")
    
    results = {
        'CORS': test_cors(),
        'analyze-insights': test_analyze_insights(),
        'nearby-hospitals': test_nearby_hospitals(),
        'transcribe': test_transcribe()
    }
    
    print("\n" + "="*60)
    print("Test Summary")
    print("="*60)
    
    for test_name, result in results.items():
        if result is True:
            status = "✓ PASS"
        elif result is False:
            status = "✗ FAIL"
        else:
            status = "⚠ SKIP"
        print(f"{test_name:.<30} {status}")
    
    passed = sum(1 for r in results.values() if r is True)
    failed = sum(1 for r in results.values() if r is False)
    skipped = sum(1 for r in results.values() if r is None)
    
    print(f"\nTotal: {passed} passed, {failed} failed, {skipped} skipped")
    print("="*60 + "\n")


if __name__ == '__main__':
    main()
