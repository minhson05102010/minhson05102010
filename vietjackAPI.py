from flask import Flask, request, jsonify
import requests
from bs4 import BeautifulSoup
import urllib.parse
import time
import re
import json
from typing import Dict, List, Optional

app = Flask(__name__)

class VietJackAPI:
    def __init__(self):
        self.base_url = "https://khoahoc.vietjack.com"
        self.search_url = f"{self.base_url}/search/query"
        self.question_url = f"{self.base_url}/question"

        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Referer': 'https://khoahoc.vietjack.com/',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })

    def search_questions(self, query: str, limit: int = 10) -> Dict:
        """
        Tìm kiếm câu hỏi trên VietJack
        Args:
            query: Câu hỏi cần tìm
            limit: Số lượng kết quả tối đa
        Returns:
            Dict chứa kết quả tìm kiếm
        """
        try:
            print(f"🔍 Đang tìm kiếm: '{query}'")

            # Gọi API tìm kiếm của VietJack
            search_results = self._search_vietjack(query)

            if not search_results or "error" in search_results:
                return {"error": "Không thể tìm kiếm trên VietJack", "results": []}

            # Xử lý và lấy thông tin chi tiết cho mỗi kết quả
            detailed_results = []
            for result in search_results[:limit]:
                detailed_result = self._get_question_details(result)
                if detailed_result:
                    detailed_results.append(detailed_result)

                # Thêm delay để tránh bị block
                time.sleep(0.5)

            print(f"✅ Tìm thấy {len(detailed_results)} kết quả chi tiết")

            return {
                "success": True,
                "total_found": len(search_results),
                "total_detailed": len(detailed_results),
                "results": detailed_results
            }

        except Exception as e:
            print(f"❌ Lỗi khi tìm kiếm: {str(e)}")
            return {"error": f"Lỗi tìm kiếm: {str(e)}", "results": []}

    def _search_vietjack(self, query: str) -> List[Dict]:
        """
        Thực hiện tìm kiếm trên VietJack
        """
        try:
            
            encoded_query = urllib.parse.quote(query)
            search_url = f"{self.search_url}?q={encoded_query}"

            print(f"📡 Gọi API: {search_url}")

            response = self.session.get(search_url, timeout=15)
            response.raise_for_status()

           
            soup = BeautifulSoup(response.content, 'html.parser')

            
            search_results = self._extract_search_results(soup)

            return search_results

        except requests.RequestException as e:
            print(f"❌ Lỗi request: {str(e)}")
            return []
        except Exception as e:
            print(f"❌ Lỗi parse: {str(e)}")
            return []

    def _extract_search_results(self, soup: BeautifulSoup) -> List[Dict]:
        """
        Trích xuất danh sách kết quả từ trang tìm kiếm
        """
        results = []

        try:
            
            possible_selectors = [
                '.search-result-item',
                '.question-card',
                '.result-item',
                '.search-item',
                'div[data-question-id]',
                '.question-link',
                'a[href*="/question/"]',
                '.list-group-item',
                '.card',
                'li a[href*="question"]'
            ]

            for selector in possible_selectors:
                elements = soup.select(selector)

                if elements:
                    print(f"📋 Tìm thấy {len(elements)} kết quả với selector: {selector}")

                    for element in elements:
                        result = self._parse_search_result_element(element)
                        if result:
                            results.append(result)

                    # Nếu đã tìm thấy kết quả thì dừng
                    if results:
                        break

            # Fallback: Tìm tất cả links có chứa "question" trong href
            if not results:
                print("🔄 Fallback: Tìm tất cả links question")
                question_links = soup.find_all('a', href=re.compile(r'/question/\d+'))

                for link in question_links[:10]:
                    href = link.get('href')
                    if href:
                       
                        if not href.startswith('http'):
                            href = self.base_url + href

                        # Extract question ID từ URL
                        question_id = self._extract_question_id_from_url(href)

                        results.append({
                            'question_id': question_id,
                            'title': link.get_text().strip() or 'Câu hỏi không có tiêu đề',
                            'url': href,
                            'preview': '',
                            'type': 'question'
                        })

            return results

        except Exception as e:
            print(f"❌ Lỗi extract search results: {str(e)}")
            return []

    def _parse_search_result_element(self, element) -> Optional[Dict]:
        """
        Parse một element kết quả tìm kiếm
        """
        try:
            
            link_elem = element if element.name == 'a' else element.find('a')
            if not link_elem:
                return None

            href = link_elem.get('href')
            if not href:
                return None

            
            if not href.startswith('http'):
                href = self.base_url + href

            
            if '/question/' not in href:
                return None

            
            question_id = self._extract_question_id_from_url(href)

           
            title = link_elem.get_text().strip()

          
            preview = ''
            preview_elem = element.find(class_=['preview', 'excerpt', 'description', 'summary'])
            if preview_elem:
                preview = preview_elem.get_text().strip()

            return {
                'question_id': question_id,
                'title': title or 'Câu hỏi không có tiêu đề',
                'url': href,
                'preview': preview,
                'type': 'question'
            }

        except Exception as e:
            print(f"⚠️ Lỗi parse element: {str(e)}")
            return None

    def _extract_question_id_from_url(self, url: str) -> Optional[str]:
        """
        Extract question ID từ URL
        VD: https://khoahoc.vietjack.com/question/123456/tinh-dao-ham -> 123456
        """
        try:
            match = re.search(r'/question/(\d+)', url)
            return match.group(1) if match else None
        except:
            return None

    def _get_question_details(self, search_result: Dict) -> Optional[Dict]:
        """
        Lấy thông tin chi tiết của một câu hỏi
        """
        try:
            question_url = search_result.get('url')
            if not question_url:
                return None

            print(f"📖 Lấy chi tiết câu hỏi: {question_url}")

            response = self.session.get(question_url, timeout=15)
            response.raise_for_status()

            soup = BeautifulSoup(response.content, 'html.parser')

            
            question_data = self._parse_question_page(soup, search_result)

            return question_data

        except Exception as e:
            print(f"⚠️ Không thể lấy chi tiết câu hỏi {search_result.get('url')}: {str(e)}")
            return search_result  

    def _parse_question_page(self, soup: BeautifulSoup, basic_info: Dict) -> Dict:
        """
        Parse trang chi tiết câu hỏi để lấy đầy đủ thông tin
        """
        try:
            result = basic_info.copy()

           
            question_content = self._extract_question_content(soup)
            if question_content:
                result['question_content'] = question_content

           
            answer_data = self._extract_answer_content(soup)
            if answer_data:
                result.update(answer_data)

            
            meta_info = self._extract_meta_info(soup)
            if meta_info:
                result.update(meta_info)

           
            related_questions = self._extract_related_questions(soup)
            if related_questions:
                result['related_questions'] = related_questions

            return result

        except Exception as e:
            print(f"⚠️ Lỗi parse question page: {str(e)}")
            return basic_info

    def _extract_question_content(self, soup: BeautifulSoup) -> str:
        """
        Trích xuất nội dung câu hỏi
        """
        try:
            
            question_selectors = [
                '.question-content',
                '.question-text',
                '.problem-statement',
                '.question-body',
                'div[class*="question"]',
                '.card-body .question',
                'h2 + p',
                '.content .question'
            ]

            for selector in question_selectors:
                element = soup.select_one(selector)
                if element:
                    content = element.get_text().strip()
                    if content and len(content) > 10:  
                        return self._clean_text(content)

            
            title_elem = soup.find('h1') or soup.find('title')
            if title_elem:
                return self._clean_text(title_elem.get_text())

            return ''

        except Exception as e:
            print(f"⚠️ Lỗi extract question content: {str(e)}")
            return ''

    def _extract_answer_content(self, soup: BeautifulSoup) -> Dict:
        """
        Trích xuất nội dung đáp án
        """
        try:
            answer_data = {}

            
            correct_answer = self._find_correct_answer(soup)
            if correct_answer:
                answer_data['correct_answer'] = correct_answer

           
            choices = self._find_answer_choices(soup)
            if choices:
                answer_data['choices'] = choices

           
            explanation = self._find_explanation(soup)
            if explanation:
                answer_data['explanation'] = explanation

           
            solution = self._find_solution(soup)
            if solution:
                answer_data['solution'] = solution

            return answer_data

        except Exception as e:
            print(f"⚠️ Lỗi extract answer: {str(e)}")
            return {}

    def _find_correct_answer(self, soup: BeautifulSoup) -> str:
        """Tìm đáp án đúng"""
        selectors = [
            '.correct-answer',
            '.answer.correct',
            '.right-answer',
            'span[class*="correct"]',
            '.answer-key',
            'div[class*="answer"][class*="correct"]'
        ]

        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return self._clean_text(element.get_text())

        return ''

    def _find_answer_choices(self, soup: BeautifulSoup) -> List[Dict]:
        """Tìm các lựa chọn đáp án"""
        choices = []

      
        choice_selectors = [
            '.answer-choice',
            '.option',
            '.choice',
            'li[class*="choice"]',
            'div[class*="option"]'
        ]

        for selector in choice_selectors:
            elements = soup.select(selector)
            if elements:
                for i, element in enumerate(elements):
                    choice_text = self._clean_text(element.get_text())
                    if choice_text:
                        is_correct = 'correct' in element.get('class', []) or 'right' in element.get('class', [])
                        choices.append({
                            'label': chr(65 + i),  # A, B, C, D...
                            'text': choice_text,
                            'is_correct': is_correct
                        })
                break

        return choices

    def _find_explanation(self, soup: BeautifulSoup) -> str:
        """Tìm lời giải thích"""
        selectors = [
            '.explanation',
            '.answer-explanation',
            '.solution-detail',
            '.detailed-solution',
            'div[class*="explain"]',
            '.answer-detail'
        ]

        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return self._clean_text(element.get_text())

        return ''

    def _find_solution(self, soup: BeautifulSoup) -> str:
        """Tìm hướng dẫn giải"""
        selectors = [
            '.solution',
            '.step-solution',
            '.answer-steps',
            '.solution-steps',
            'div[class*="solution"]'
        ]

        for selector in selectors:
            element = soup.select_one(selector)
            if element:
                return self._clean_text(element.get_text())

        return ''

    def _extract_meta_info(self, soup: BeautifulSoup) -> Dict:
        """Trích xuất thông tin meta (môn học, cấp độ, etc.)"""
        meta_info = {}

        try:
            
            subject_elem = soup.select_one('.subject, .category, [class*="subject"]')
            if subject_elem:
                meta_info['subject'] = self._clean_text(subject_elem.get_text())

            
            grade_elem = soup.select_one('.grade, .level, [class*="grade"], [class*="level"]')
            if grade_elem:
                meta_info['grade'] = self._clean_text(grade_elem.get_text())

            
            topic_elem = soup.select_one('.topic, .chapter, [class*="topic"]')
            if topic_elem:
                meta_info['topic'] = self._clean_text(topic_elem.get_text())

           
            difficulty_elem = soup.select_one('.difficulty, [class*="difficulty"]')
            if difficulty_elem:
                meta_info['difficulty'] = self._clean_text(difficulty_elem.get_text())

        except Exception as e:
            print(f"⚠️ Lỗi extract meta: {str(e)}")

        return meta_info

    def _extract_related_questions(self, soup: BeautifulSoup) -> List[Dict]:
        """Trích xuất câu hỏi liên quan"""
        related = []

        try:
            related_section = soup.select_one('.related-questions, .similar-questions, [class*="related"]')
            if related_section:
                links = related_section.find_all('a', href=re.compile(r'/question/\d+'))

                for link in links[:5]:  #
                    href = link.get('href')
                    if not href.startswith('http'):
                        href = self.base_url + href

                    related.append({
                        'title': self._clean_text(link.get_text()),
                        'url': href,
                        'question_id': self._extract_question_id_from_url(href)
                    })

        except Exception as e:
            print(f"⚠️ Lỗi extract related: {str(e)}")

        return related

    def _clean_text(self, text: str) -> str:
        """Làm sạch text"""
        if not text:
            return ''

        
        text = re.sub(r'\s+', ' ', text.strip())

        
        text = re.sub(r'[\r\n\t]+', ' ', text)

        return text


vietjack_api = VietJackAPI()

@app.route('/api/search', methods=['POST'])
def search_questions():
    """API endpoint để tìm kiếm câu hỏi (POST)"""
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({
                "success": False,
                "error": "Vui lòng cung cấp 'question' trong request body"
            }), 400

        question = data['question'].strip()
        if not question:
            return jsonify({
                "success": False,
                "error": "Câu hỏi không được để trống"
            }), 400

        limit = data.get('limit', 10)

        
        results = vietjack_api.search_questions(question, limit)

        if "error" in results:
            return jsonify({
                "success": False,
                "error": results["error"],
                "question": question,
                "results": []
            }), 500

        response_data = {
            "success": True,
            "question": question,
            "total_found": results.get("total_found", 0),
            "total_detailed": results.get("total_detailed", 0),
            "results": results.get("results", []),
            "message": f"Tìm thấy {results.get('total_detailed', 0)} kết quả chi tiết cho câu hỏi: '{question}'"
        }

        return jsonify(response_data)

    except Exception as e:
        print(f"❌ Lỗi API: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Lỗi server: {str(e)}"
        }), 500

@app.route('/api/search', methods=['GET'])
def search_questions_get():
    """API endpoint để tìm kiếm câu hỏi (GET)"""
    try:
        question = request.args.get('q', '').strip()
        if not question:
            return jsonify({
                "success": False,
                "error": "Vui lòng cung cấp tham số 'q' với câu hỏi"
            }), 400

        limit = int(request.args.get('limit', 10))

        print(f"🔍 Tìm kiếm GET: '{question}' (limit: {limit})")

        
        results = vietjack_api.search_questions(question, limit)

        if "error" in results:
            return jsonify({
                "success": False,
                "error": results["error"],
                "question": question,
                "results": []
            }), 500

        response_data = {
            "success": True,
            "question": question,
            "total_found": results.get("total_found", 0),
            "total_detailed": results.get("total_detailed", 0),
            "results": results.get("results", []),
            "message": f"Tìm thấy {results.get('total_detailed', 0)} kết quả chi tiết cho câu hỏi: '{question}'"
        }

        return jsonify(response_data)

    except Exception as e:
        print(f"❌ Lỗi API GET: {str(e)}")
        return jsonify({
            "success": False,
            "error": f"Lỗi server: {str(e)}"
        }), 500

@app.route('/api/question/<question_id>', methods=['GET'])
def get_question_by_id(question_id):
    """Lấy thông tin chi tiết của một câu hỏi theo ID"""
    try:
        if not question_id.isdigit():
            return jsonify({
                "success": False,
                "error": "Question ID phải là số"
            }), 400


        question_url = f"{vietjack_api.base_url}/question/{question_id}"

        print(f"📖 Lấy câu hỏi ID: {question_id}")

        response = vietjack_api.session.get(question_url, timeout=15)
        response.raise_for_status()

        soup = BeautifulSoup(response.content, 'html.parser')

        # Parse thông tin câu hỏi
        basic_info = {
            'question_id': question_id,
            'url': question_url,
            'title': '',
            'type': 'question'
        }

        question_data = vietjack_api._parse_question_page(soup, basic_info)

        return jsonify({
            "success": True,
            "question_id": question_id,
            "data": question_data
        })

    except requests.RequestException as e:
        return jsonify({
            "success": False,
            "error": f"Không thể truy cập câu hỏi: {str(e)}"
        }), 404
    except Exception as e:
        return jsonify({
            "success": False,
            "error": f"Lỗi server: {str(e)}"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "service": "VietJack Search API",
        "version": "2.0.0",
        "base_url": vietjack_api.base_url
    })

@app.route('/', methods=['GET'])
def home():
    """API documentation"""
    return jsonify({
        "service": "VietJack Search API by Lâm Minh Sơn💫",
        "version": "2.0.0",
        "description": "API tìm kiếm và lấy đáp án từ VietJack",
        "base_url": vietjack_api.base_url,
        "endpoints": {
            "POST /api/search": {
                "description": "Tìm kiếm câu hỏi và lấy đáp án chi tiết",
                "body": {
                    "question": "câu hỏi cần tìm",
                    "limit": "số lượng kết quả (mặc định 10)"
                },
                "example": 'curl -X POST -H "Content-Type: application/json" -d \'{"question":"tính đạo hàm","limit":5}\' http://localhost:5000/api/search'
            },
            "GET /api/search": {
                "description": "Tìm kiếm câu hỏi qua query parameter",
                "params": {
                    "q": "câu hỏi cần tìm",
                    "limit": "số lượng kết quả (mặc định 10)"
                },
                "example": "curl 'http://localhost:5000/api/search?q=tính đạo hàm&limit=5'"
            },
            "GET /api/question/<id>": {
                "description": "Lấy thông tin chi tiết câu hỏi theo ID",
                "example": "curl 'http://localhost:5000/api/question/123456'"
            },
            "GET /api/health": {
                "description": "Kiểm tra trạng thái API"
            }
        },
        "response_format": {
            "success": True,
            "question": "câu hỏi đã tìm",
            "total_found": "tổng số kết quả tìm thấy",
            "total_detailed": "số kết quả đã lấy chi tiết",
            "results": [
                {
                    "question_id": "ID câu hỏi",
                    "title": "tiêu đề câu hỏi",
                    "url": "link đến câu hỏi",
                    "question_content": "nội dung câu hỏi",
                    "correct_answer": "đáp án đúng",
                    "choices": "các lựa chọn (nếu có)",
                    "explanation": "lời giải thích",
                    "solution": "hướng dẫn giải",
                    "subject": "môn học",
                    "grade": "cấp độ/lớp",
                    "topic": "chủ đề",
                    "related_questions": "câu hỏi liên quan"
                }
            ]
        }
    })

if __name__ == '__main__':
    print("=" * 80)
    print("🚀 VietJack API v1.0 💕dùng API mson vui vẻ nhoo iu vãi nhồn:333")
    print("=" * 80)
    print(f"📡 API Server: http://localhost:5000")
    print(f"📡 API Server: http://127.0.0.1:5000")
    print(f"🌐 VietJack Base URL: {vietjack_api.base_url}")
    print("=" * 80)
    print("📚 Endpoints:")
    print("   GET  /                         - Tài liệu API")
    print("   POST /api/search              - Tìm kiếm câu hỏi (JSON)")
    print("   GET  /api/search?q=...        - Tìm kiếm câu hỏi (Query)")
    print("   GET  /api/question/<id>       - Lấy câu hỏi theo ID")
    print("   GET  /api/health              - Kiểm tra trạng thái")
    print("=" * 80)
    print("💡 Ví dụ sử dụng:")
    print("   curl 'http://localhost:5000/api/search?q=tính đạo hàm&limit=3'")
    print("   curl 'http://localhost:5000/api/question/123456'")
    print("=" * 80)
    print("⚡ Sẵn sàng nhận request!")
    print()

    app.run(debug=True, host='0.0.0.0', port=5000)
