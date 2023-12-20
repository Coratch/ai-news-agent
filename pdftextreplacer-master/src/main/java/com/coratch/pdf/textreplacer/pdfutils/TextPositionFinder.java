package com.coratch.pdf.textreplacer.pdfutils;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

import org.apache.pdfbox.text.PDFTextStripper;
import org.apache.pdfbox.text.TextPosition;

/**
 * @author : Coratch
 * @create 2023/12/19 11:03 PM
 *
 */
public class TextPositionFinder extends PDFTextStripper {
	private String searchText;

	public String current = "";

	/**
	 * The resulting text position if text is found in pdf
	 */
	public List<TextPosition> textPositionList = new ArrayList<>();

	public boolean found = false;

	/**
	 * Instantiate a new PDFTextStripper object.
	 */
	public TextPositionFinder(String searchText) throws IOException {
		this.searchText = searchText;
	}

	/**
	 * Override the default functionality of PDFTextStripper.
	 */
	@Override
	protected void writeString(String string, List<TextPosition> textPositions) throws IOException {
		for (TextPosition textPosition : textPositions) {
			current += textPosition.getUnicode();
			if (searchText.startsWith(current)) {
				found = true;
			} else {
				current = "";
			}

			if (current.length() == 1) {
				this.textPositionList.add(textPosition);
			}

		}
	}

	public List<TextPosition> getTextPosition() {
		return textPositionList;
	}

	public void setTextPosition(List<TextPosition> textPosition) {
		this.textPositionList = textPosition;
	}

	public boolean textExists() {
		return found;
	}

}